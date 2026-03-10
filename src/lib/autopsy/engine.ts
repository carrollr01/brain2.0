import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { extractReadableText } from './html-extractor';
import { AUTOPSY_SYSTEM_PROMPT } from './prompts';
import type { AutopsySSEEvent, AutopsySource } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const FETCH_URL_TOOL = {
  name: 'fetch_url',
  description: 'Fetch the full content of a web page. Use this to read landing pages, review pages, earnings transcripts, Reddit threads, and other sources. Returns the extracted text content of the page.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: {
        type: 'string',
        description: 'The full URL to fetch',
      },
      reason: {
        type: 'string',
        description: 'Brief reason for fetching this page (e.g., "competitor pricing page", "G2 reviews")',
      },
    },
    required: ['url'],
  },
};

async function fetchUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return `Failed to fetch: HTTP ${response.status} ${response.statusText}`;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return `Non-HTML content type: ${contentType}. Cannot extract text.`;
    }

    const html = await response.text();
    return extractReadableText(html);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return 'Failed to fetch: Request timed out after 15 seconds';
    }
    return `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

function inferSourceCategory(reason: string, url: string): AutopsySource['category'] {
  const lower = (reason + ' ' + url).toLowerCase();
  if (lower.includes('reddit') || lower.includes('ycombinator') || lower.includes('forum') || lower.includes('hacker news')) return 'reddit';
  if (lower.includes('review') || lower.includes('g2') || lower.includes('capterra') || lower.includes('trustpilot')) return 'reviews';
  if (lower.includes('earning') || lower.includes('transcript') || lower.includes('investor') || lower.includes('quarterly')) return 'earnings';
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

  try {
    onEvent({ type: 'status', message: `Starting research on ${companyName}...` });

    const userMessage = context
      ? `Run a deep structural analysis of ${companyName}. Additional context: ${context}`
      : `Run a deep structural analysis of ${companyName}.`;

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userMessage },
    ];

    let iteration = 0;
    const MAX_ITERATIONS = 60; // Safety cap

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: AUTOPSY_SYSTEM_PROMPT,
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: 30 },
          FETCH_URL_TOOL,
        ],
        messages,
      });

      // Process response content blocks
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      let hasCustomToolUse = false;

      for (const block of response.content) {
        if (block.type === 'text') {
          fullReportText += block.text;
          onEvent({ type: 'report_chunk', content: block.text });
        } else if (block.type === 'tool_use' && block.name === 'fetch_url') {
          hasCustomToolUse = true;
          const input = block.input as { url: string; reason?: string };
          const reason = input.reason || 'Fetching page';

          onEvent({ type: 'tool_call', tool: 'fetch_url', input: reason });
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
          source.status = result.startsWith('Failed to fetch') ? 'failed' : 'fetched';
          onEvent({ type: 'source_checklist', data: { sources: [...sources] } });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }
        // server_tool_use and web_search_tool_result blocks are handled by Anthropic
        // We just need to emit status for web searches
        if (block.type === 'server_tool_use' && block.name === 'web_search') {
          const input = block.input as { query?: string };
          const query = input.query || 'web search';
          onEvent({ type: 'tool_call', tool: 'web_search', input: query });
          onEvent({ type: 'status', message: `Searching: ${query}` });
        }
      }

      // Check if we're done
      if (response.stop_reason === 'end_turn') {
        break;
      }

      // If there were tool uses, continue the loop
      if (response.stop_reason === 'tool_use') {
        // Append assistant message with the full response content
        messages.push({ role: 'assistant', content: response.content });

        // If we had custom tool uses, append tool results
        if (hasCustomToolUse && toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults });
        }

        continue;
      }

      // Any other stop reason — break
      break;
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
    await supabase
      .from('autopsy_reports')
      .update({
        status: 'failed',
        error_message: errorMessage,
        source_checklist: { sources },
      })
      .eq('id', reportId);

    onEvent({ type: 'error', message: errorMessage });
  }
}
