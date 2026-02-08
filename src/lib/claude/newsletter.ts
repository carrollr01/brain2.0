import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization to ensure env vars are loaded at runtime
let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    // Try CLAUDE_API_KEY first (local override), then fall back to ANTHROPIC_API_KEY
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Neither CLAUDE_API_KEY nor ANTHROPIC_API_KEY environment variable is set');
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

const NEWSLETTER_SUMMARY_PROMPT = `You are a concise newsletter summarizer for a tech/investing reader. Given the text content of an email newsletter, produce a clear, informative summary that captures:

1. The main topic(s) discussed
2. Key insights, data points, or arguments
3. Any actionable takeaways or recommendations
4. Notable people, companies, or events mentioned

Keep the summary between 150-300 words. Use clear paragraphs. Start each paragraph with a **Bold Topic**: format for scannability. Do not include greetings, subscription links, or promotional content in the summary.`;

export async function summarizeNewsletter(
  subject: string,
  textContent: string
): Promise<string> {
  // Truncate very long newsletters to avoid token limits
  const truncatedContent = textContent.slice(0, 50000);

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: NEWSLETTER_SUMMARY_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Subject: ${subject}\n\nNewsletter content:\n${truncatedContent}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return content.text;
}
