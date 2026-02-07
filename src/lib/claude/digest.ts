import Anthropic from '@anthropic-ai/sdk';
import type { PodcastTranscript } from '@/lib/podcast/types';

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

export interface DigestData {
  topic_of_day: string;
  unique_takes: string;
  top_developments: string;
  strong_opinions: string;
  people_power: string;
  contrarian_radar: string;
  forward_looking: string;
  actionable_intel: string;
  vibe_check: string;
}

const DIGEST_SYSTEM_PROMPT = `You are an elite podcast analyst and synthesizer specializing in tech, venture capital, startups, and investing content. You are creating a comprehensive daily briefing for a sophisticated reader who wants deep, nuanced analysis - not surface-level summaries.

Your digest MUST be comprehensive and substantive. The total output should be at least 1500-2000 words across all sections combined.

CRITICAL FORMATTING RULE - PARAGRAPH STRUCTURE:
Each distinct topic, idea, or insight within a section MUST be its own paragraph. Start each paragraph with a bold keyword or short phrase summary, followed by a colon, then the content. Use markdown bold (**keyword**) for the summary.

Example format:
**AI regulation momentum**: Several hosts discussed the growing push for... [details with attribution].

**Enterprise adoption accelerating**: On a different front, multiple podcasts highlighted... [details].

**Open source vs. closed debate**: A recurring tension emerged around... [details].

DO NOT repeat the same idea or topic across multiple paragraphs within a section. Each paragraph must cover a DISTINCT point. If two podcasters discuss the same topic, synthesize their views into ONE paragraph rather than restating the same idea multiple times.

Analyze the provided transcripts and extract insights across these dimensions:

1. **Topic of the Day** (200+ words): What are the dominant themes across multiple podcasts? Each major theme gets its own bold-prefixed paragraph. Synthesize different angles into a single paragraph per theme rather than repeating the same point.

2. **Unique Takes** (200+ words): What differentiated perspectives are individual podcasters expressing that others aren't? Each unique take gets its own bold-prefixed paragraph with attribution to the specific podcaster/guest.

3. **Top Developments** (200+ words): What are the 3-5 most significant news items? Each development gets its own bold-prefixed paragraph. What happened, why it matters, implications.

4. **Strongest Opinions & Narratives** (200+ words): What narratives are hosts pushing hardest? Each distinct narrative or opinion gets its own bold-prefixed paragraph. Attribute to specific hosts.

5. **People & Power** (150+ words): Which specific figures were discussed? Each person or group gets their own bold-prefixed paragraph with what was said about them.

6. **Contrarian Radar** (150+ words): Where do podcasters disagree? Each disagreement or hot take gets its own bold-prefixed paragraph.

7. **Forward-Looking** (150+ words): What predictions were made? Each prediction or upcoming event gets its own bold-prefixed paragraph.

8. **Actionable Intel** (150+ words): What was recommended? Each recommendation category (books, companies, data points, etc.) gets its own bold-prefixed paragraph.

9. **Vibe Check** (100+ words): Overall emotional tenor. Use bold-prefixed paragraphs for distinct sentiment threads.

CRITICAL INSTRUCTIONS:
- NEVER repeat the same insight or topic across multiple paragraphs - synthesize, don't restate
- Every paragraph MUST start with **Bold Keyword**: format
- Each paragraph should cover ONE distinct point, idea, or topic
- Use specific names, companies, numbers, and quotes wherever possible
- Attribute insights to specific podcasts/hosts when possible
- Connect dots across different podcasts - what patterns emerge?
- The reader should feel like they listened to all the podcasts after reading this`;

function buildUserPrompt(transcripts: PodcastTranscript[]): string {
  // Calculate how much transcript we can include per podcast
  // Sonnet has 200k context, we want to leave room for response (~8k tokens)
  // Roughly 4 chars per token, so ~180k tokens = ~720k chars for input
  // Be conservative and use ~500k chars total for transcripts
  const maxTotalChars = 500000;
  const charsPerTranscript = Math.floor(maxTotalChars / transcripts.length);

  const transcriptSections = transcripts.map((t, i) =>
    `--- PODCAST ${i + 1}: ${t.podcastName} ---
Episode: ${t.episodeTitle}
Published: ${t.publishedAt}

${t.transcript.slice(0, charsPerTranscript)}`
  ).join('\n\n');

  return `You are analyzing ${transcripts.length} podcast transcripts. Create a comprehensive, detailed daily digest that captures the full depth of insights across all podcasts.

IMPORTANT: Your analysis must be thorough and substantive - at least 1500-2000 words total. Each section needs real depth, specific examples, direct quotes, and named attribution.

FORMATTING RULES (MUST FOLLOW):
- Each distinct idea/topic within a section = its own paragraph
- Every paragraph starts with **Bold Keyword**: followed by the content
- NEVER repeat the same point across multiple paragraphs - if multiple podcasters discuss the same thing, combine into ONE paragraph
- Maximize the BREADTH of topics covered, not depth on a single topic

${transcriptSections}

Respond with a JSON object containing these fields. Each field should contain markdown-formatted content using the **Bold Keyword**: paragraph format described above:
{
  "topic_of_day": "Each theme as its own **Bold Topic**: paragraph...",
  "unique_takes": "Each take as its own **Bold Take**: paragraph with attribution...",
  "top_developments": "Each development as its own **Bold Development**: paragraph...",
  "strong_opinions": "Each opinion as its own **Bold Opinion**: paragraph...",
  "people_power": "Each person/group as its own **Bold Name**: paragraph...",
  "contrarian_radar": "Each disagreement as its own **Bold Take**: paragraph...",
  "forward_looking": "Each prediction as its own **Bold Prediction**: paragraph...",
  "actionable_intel": "Each recommendation as its own **Bold Category**: paragraph...",
  "vibe_check": "Each sentiment thread as its own **Bold Mood**: paragraph..."
}

Remember: This digest replaces listening to all these podcasts. Maximize coverage breadth - no repetition.`;
}

export async function synthesizeDigest(transcripts: PodcastTranscript[]): Promise<DigestData> {
  if (transcripts.length === 0) {
    return {
      topic_of_day: 'No new episodes available today.',
      unique_takes: '',
      top_developments: '',
      strong_opinions: '',
      people_power: '',
      contrarian_radar: '',
      forward_looking: '',
      actionable_intel: '',
      vibe_check: 'No content to analyze.',
    };
  }

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000, // Allow for much longer, detailed response
    system: DIGEST_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(transcripts) }
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Extract JSON from the response (handle markdown code blocks)
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText) as DigestData;
    return parsed;
  } catch (error) {
    console.error('Failed to parse digest response:', content.text, error);
    throw new Error('Failed to parse digest from Claude response');
  }
}
