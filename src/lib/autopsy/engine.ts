import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { extractReadableText } from './html-extractor';
import { AUTOPSY_SYSTEM_PROMPT } from './prompts';
import type { AutopsySSEEvent, AutopsySource } from './types';

const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: 'Fetch the full content of a web page. Use this to read landing pages, review pages, earnings transcripts, Reddit threads, and other sources. Returns the extracted text content of the page. You MUST use this tool to read pages — search snippets are not enough.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The full URL to fetch',
      },
      reason: {
        type: 'string',
        description: 'Brief reason for fetching this page (e.g., "competitor pricing page", "G2 reviews", "Reddit discussion thread", "company homepage")',
      },
    },
    required: ['url', 'reason'],
  },
};

async function fetchUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return `Failed to fetch: HTTP ${response.status} ${response.statusText}. Try a different URL or search for cached/alternative versions.`;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return `Non-HTML content type: ${contentType}. Try a different URL.`;
    }

    const html = await response.text();
    const extracted = extractReadableText(html);

    if (extracted.length < 100) {
      return `Page returned very little readable content (${extracted.length} chars). The page may require JavaScript or login. Try a different source.`;
    }

    return extracted;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'Failed to fetch: Request timed out after 20 seconds. Try a different URL.';
    }
    return `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}. Try a different URL.`;
  }
}

function inferSourceCategory(reason: string, url: string): AutopsySource['category'] {
  const lower = (reason + ' ' + url).toLowerCase();
  if (lower.includes('reddit') || lower.includes('ycombinator') || lower.includes('forum') || lower.includes('hacker news') || lower.includes('thread')) return 'reddit';
  if (lower.includes('review') || lower.includes('g2') || lower.includes('capterra') || lower.includes('trustpilot') || lower.includes('trustradius')) return 'reviews';
  if (lower.includes('earning') || lower.includes('transcript') || lower.includes('investor') || lower.includes('quarterly') || lower.includes('financial') || lower.includes('revenue') || lower.includes('sec') || lower.includes('annual report')) return 'earnings';
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

  // Create Anthropic client inside the function to ensure fresh env vars
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  try {
    onEvent({ type: 'status', message: `Initiating deep research on ${companyName}...` });

    const userMessage = context
      ? `Run a deep structural analysis of ${companyName}. Additional context: ${context}. Remember: you MUST research ALL FOUR source categories (company/competitors, earnings, reviews, Reddit) before writing the report. Fetch at least 13 pages total.`
      : `Run a deep structural analysis of ${companyName}. Remember: you MUST research ALL FOUR source categories (company/competitors, earnings, reviews, Reddit) before writing the report. Start by searching for and fetching the company's own homepage, then systematically work through each category. Fetch at least 13 pages total.`;

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let iteration = 0;
    const MAX_ITERATIONS = 100; // High cap for thorough research

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      onEvent({ type: 'status', message: `Research iteration ${iteration}...` });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000, // Large budget for thorough research + report
        system: AUTOPSY_SYSTEM_PROMPT,
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: 50 },
          FETCH_URL_TOOL,
        ],
        messages,
      });

      // Process ALL content blocks in the response
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let hasCustomToolUse = false;

      for (const block of response.content) {
        if (block.type === 'text') {
          fullReportText += block.text;
          onEvent({ type: 'report_chunk', content: block.text });
        } else if (block.type === 'tool_use' && block.name === 'fetch_url') {
          // Custom tool — we must execute and return result
          hasCustomToolUse = true;
          const input = block.input as { url: string; reason?: string };
          const reason = input.reason || 'Fetching page';

          onEvent({ type: 'tool_call', tool: 'fetch_url', input: `${reason}: ${input.url}` });
          onEvent({ type: 'status', message: `Fetching: ${reason}` });

          // Track source
          const source: AutopsySource = {
            category: inferSourceCategory(reason, input.url),
            name: reason,
            url: input.url,
            status: 'searching',
          };
          sources.push(source);
          onEvent({ type: 'source_checklist', data: { sources: [...sources] } });

          // Execute fetch
          const result = await fetchUrl(input.url);
          source.status = result.startsWith('Failed to fetch') || result.startsWith('Non-HTML') || result.startsWith('Page returned very little') ? 'failed' : 'fetched';
          onEvent({ type: 'source_checklist', data: { sources: [...sources] } });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        } else if (block.type === 'server_tool_use' && block.name === 'web_search') {
          // Server-side tool — auto-executed by Anthropic, just emit status
          const input = block.input as { query?: string };
          const query = input.query || 'web search';
          onEvent({ type: 'tool_call', tool: 'web_search', input: query });
          onEvent({ type: 'status', message: `Searching: ${query}` });
        }
        // web_search_tool_result blocks are auto-included — no action needed
      }

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        break;
      }

      // Continue the loop if Claude needs tool results
      if (response.stop_reason === 'tool_use') {
        // Always append the assistant's full response (includes server tool results)
        messages.push({ role: 'assistant', content: response.content });

        // Only append tool results if we have custom tool results to send back
        if (hasCustomToolUse && toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults });
        }

        continue;
      }

      // max_tokens or other stop reason — break
      console.log(`Autopsy loop ended with stop_reason: ${response.stop_reason} at iteration ${iteration}`);
      break;
    }

    if (iteration >= MAX_ITERATIONS) {
      console.warn(`Autopsy hit MAX_ITERATIONS (${MAX_ITERATIONS}) for ${companyName}`);
    }

    // Save the completed report
    const { error: updateError } = await supabase
      .from('autopsy_reports')
      .update({
        report_content: fullReportText,
        source_checklist: { sources },
        metadata: {
          model: 'claude-sonnet-4-20250514',
          iterations: iteration,
          source_count: sources.length,
          fetched_count: sources.filter(s => s.status === 'fetched').length,
          failed_count: sources.filter(s => s.status === 'failed').length,
          categories: {
            competitor: sources.filter(s => s.category === 'competitor').length,
            earnings: sources.filter(s => s.category === 'earnings').length,
            reviews: sources.filter(s => s.category === 'reviews').length,
            reddit: sources.filter(s => s.category === 'reddit').length,
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

    // Update report status to failed
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
