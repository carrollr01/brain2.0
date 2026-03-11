import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { extractReadableText } from './html-extractor';
import { AUTOPSY_SYSTEM_PROMPT } from './prompts';
import type { AutopsySSEEvent, AutopsySource } from './types';

const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: 'Fetch the full content of a web page. Use this after every web_search to read the actual content of promising URLs. Returns extracted text. You MUST use this — search snippets are never sufficient for analysis.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The full URL to fetch',
      },
      reason: {
        type: 'string',
        description: 'Brief reason for fetching (e.g., "TSMC homepage", "G2 reviews for Datadog", "Reddit thread about switching from X")',
      },
    },
    required: ['url', 'reason'],
  },
};

async function doFetch(url: string): Promise<{ html: string; finalUrl: string } | string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const html = await response.text();

    // Even on non-200 status, check if there's a meta redirect or usable content
    if (!response.ok) {
      // Look for meta refresh redirect — handles patterns like:
      // <meta http-equiv="refresh" content="0;url='https://example.com/page'" />
      const metaRedirect = html.match(/url=['"]?\s*(https?:\/\/[^"'\s>]+)/i);
      if (metaRedirect && metaRedirect[1]) {
        const redirectUrl = metaRedirect[1].replace(/['"]$/, ''); // Strip trailing quote
        return doFetch(redirectUrl);
      }
      // If substantial HTML content despite error status, try to extract anyway
      // (many corporate WAFs return 403 but still serve full page content)
      if (html.length > 1000) {
        return { html, finalUrl: response.url || url };
      }
      return `[FETCH FAILED] HTTP ${response.status} for ${url}. This site likely blocks automated requests. Search for the company on Wikipedia, news sites, or investor pages instead — those are often MORE useful than the corporate homepage anyway.`;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return `[FETCH FAILED] Non-HTML content (${contentType}). Search for an alternative URL.`;
    }

    return { html, finalUrl: response.url || url };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return `[FETCH FAILED] Timeout after 20s for ${url}. Try a different URL.`;
    }
    return `[FETCH FAILED] ${error instanceof Error ? error.message : 'Unknown error'} for ${url}. Try a different URL.`;
  }
}

async function fetchUrl(url: string): Promise<string> {
  try {
    const result = await doFetch(url);

    if (typeof result === 'string') {
      return result; // Error message
    }

    const extracted = extractReadableText(result.html);

    if (extracted.length < 50) {
      return `[FETCH FAILED] Page at ${url} returned almost no readable text (likely JavaScript-only rendering). Search for an alternative page or a cached/article version.`;
    }

    return extracted;
  } catch (error) {
    return `[FETCH FAILED] ${error instanceof Error ? error.message : 'Unknown error'} for ${url}. Try a different URL.`;
  }
}

function inferSourceCategory(reason: string, url: string): AutopsySource['category'] {
  const lower = (reason + ' ' + url).toLowerCase();
  if (lower.includes('reddit') || lower.includes('ycombinator') || lower.includes('forum') || lower.includes('hacker news') || lower.includes('thread') || lower.includes('discussion')) return 'reddit';
  if (lower.includes('review') || lower.includes('g2') || lower.includes('capterra') || lower.includes('trustpilot') || lower.includes('trustradius') || lower.includes('rating')) return 'reviews';
  if (lower.includes('earning') || lower.includes('transcript') || lower.includes('investor') || lower.includes('quarterly') || lower.includes('financial') || lower.includes('revenue') || lower.includes('sec') || lower.includes('annual report') || lower.includes('10-k') || lower.includes('10-q')) return 'earnings';
  return 'competitor';
}

export async function runAutopsy(
  companyName: string,
  context: string | undefined,
  reportId: string,
  onEvent: (event: AutopsySSEEvent) => void
): Promise<void> {
  const supabase = createClient();
  const sources: AutopsySource[] = [];
  let fullReportText = '';
  const fetchedUrls = new Set<string>();

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  try {
    onEvent({ type: 'status', message: `Initiating deep research on ${companyName}...` });

    const userMessage = context
      ? `Run a deep structural analysis of ${companyName}. Additional context: ${context}.

IMPORTANT: Work through the research categories IN ORDER. After each web_search, immediately use fetch_url on the best URLs from the results. Do not just read search snippets — you must fetch and read full pages. Start with the company's own website.`
      : `Run a deep structural analysis of ${companyName}.

IMPORTANT: Work through the research categories IN ORDER. After each web_search, immediately use fetch_url on the best URLs from the results. Do not just read search snippets — you must fetch and read full pages. Start by searching for "${companyName} official website" and fetching their homepage.`;

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let iteration = 0;
    const MAX_ITERATIONS = 80;
    let iterationsWithoutNewFetch = 0;
    const MAX_STALE_ITERATIONS = 8; // Break if 8 iterations pass with no new successful fetch

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const fetchedCount = sources.filter(s => s.status === 'fetched').length;
      onEvent({ type: 'status', message: `Research iteration ${iteration} (${fetchedCount} pages fetched)...` });

      // Stuck detection: if too many iterations without progress, nudge Claude
      if (iterationsWithoutNewFetch >= MAX_STALE_ITERATIONS) {
        console.warn(`Autopsy stale after ${iterationsWithoutNewFetch} iterations without new fetch. Breaking.`);
        onEvent({ type: 'status', message: 'Wrapping up research...' });

        // Add a nudge message to force report writing
        messages.push({
          role: 'user',
          content: `You have been researching for a while. You have fetched ${fetchedCount} pages so far. Please wrap up your research now and write the full report based on what you have gathered. If you have gaps in your source coverage, note them in the report.`,
        });
        iterationsWithoutNewFetch = 0; // Reset so we don't immediately break again
      }

      // Use streaming to prevent SDK timeout
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000,
        system: AUTOPSY_SYSTEM_PROMPT,
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: 50 },
          FETCH_URL_TOOL,
        ],
        messages,
      });

      // Stream text chunks to client in real-time
      stream.on('text', (textDelta) => {
        fullReportText += textDelta;
        onEvent({ type: 'report_chunk', content: textDelta });
      });

      const response = await stream.finalMessage();

      // Process content blocks for tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let hasCustomToolUse = false;
      let newFetchThisIteration = false;

      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'fetch_url') {
          hasCustomToolUse = true;
          const input = block.input as { url: string; reason?: string };
          const reason = input.reason || 'Fetching page';
          const url = input.url;

          onEvent({ type: 'tool_call', tool: 'fetch_url', input: `${reason}: ${url}` });
          onEvent({ type: 'status', message: `Fetching: ${reason}` });

          // Check for duplicate fetch
          if (fetchedUrls.has(url)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `[ALREADY FETCHED] You already fetched this URL. Use the content from before, or search for a different URL.`,
            });
            continue;
          }
          fetchedUrls.add(url);

          // Track source
          const source: AutopsySource = {
            category: inferSourceCategory(reason, url),
            name: reason,
            url: url,
            status: 'searching',
          };
          sources.push(source);
          onEvent({ type: 'source_checklist', data: { sources: [...sources] } });

          // Execute fetch
          const result = await fetchUrl(url);
          const failed = result.startsWith('[FETCH FAILED]');
          source.status = failed ? 'failed' : 'fetched';

          if (!failed) {
            newFetchThisIteration = true;
          }

          onEvent({ type: 'source_checklist', data: { sources: [...sources] } });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        } else if (block.type === 'server_tool_use' && block.name === 'web_search') {
          const input = block.input as { query?: string };
          const query = input.query || 'web search';
          onEvent({ type: 'tool_call', tool: 'web_search', input: query });
          onEvent({ type: 'status', message: `Searched: ${query}` });
        }
      }

      // Track stale iterations
      if (newFetchThisIteration) {
        iterationsWithoutNewFetch = 0;
      } else {
        iterationsWithoutNewFetch++;
      }

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        break;
      }

      // Continue the loop if Claude needs tool results
      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content });

        if (hasCustomToolUse && toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults });
        }

        continue;
      }

      console.log(`Autopsy loop ended with stop_reason: ${response.stop_reason} at iteration ${iteration}`);
      break;
    }

    if (iteration >= MAX_ITERATIONS) {
      console.warn(`Autopsy hit MAX_ITERATIONS (${MAX_ITERATIONS}) for ${companyName}`);
    }

    // Save the completed report
    const fetchedCount = sources.filter(s => s.status === 'fetched').length;
    const failedCount = sources.filter(s => s.status === 'failed').length;

    const { error: updateError } = await supabase
      .from('autopsy_reports')
      .update({
        report_content: fullReportText,
        source_checklist: { sources },
        metadata: {
          model: 'claude-sonnet-4-20250514',
          iterations: iteration,
          source_count: sources.length,
          fetched_count: fetchedCount,
          failed_count: failedCount,
          categories: {
            competitor: sources.filter(s => s.category === 'competitor' && s.status === 'fetched').length,
            earnings: sources.filter(s => s.category === 'earnings' && s.status === 'fetched').length,
            reviews: sources.filter(s => s.category === 'reviews' && s.status === 'fetched').length,
            reddit: sources.filter(s => s.category === 'reddit' && s.status === 'fetched').length,
          },
        },
        status: 'complete',
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Failed to save report:', updateError);
      onEvent({ type: 'error', message: 'Report generated but failed to save to database' });
      return;
    }

    onEvent({ type: 'source_checklist', data: { sources } });
    onEvent({ type: 'complete', report_id: reportId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Autopsy engine error:', error);

    try {
      await supabase
        .from('autopsy_reports')
        .update({
          status: 'failed',
          error_message: errorMessage,
          source_checklist: { sources },
        })
        .eq('id', reportId);
    } catch (dbError) {
      console.error('Failed to update report status:', dbError);
    }

    onEvent({ type: 'error', message: errorMessage });
  }
}
