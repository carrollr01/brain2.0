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

Your digest MUST be comprehensive and substantive. Each section should be detailed with multiple paragraphs and specific examples. The total output should be at least 1500-2000 words across all sections combined.

Analyze the provided transcripts and extract insights across these dimensions:

1. **Topic of the Day** (200+ words): What is the dominant theme across multiple podcasts? Why is this topic trending now? What's the underlying driver? Synthesize the different angles various hosts are taking on this topic. Include specific examples and quotes where relevant.

2. **Unique Takes** (200+ words): What differentiated perspectives are individual podcasters expressing that others aren't? What contrarian or novel viewpoints emerged? Why are these takes interesting or important? Attribute takes to specific podcasters/guests.

3. **Top Developments** (200+ words): What are the 3-5 most significant news items, announcements, or events discussed? For each: What happened? Why does it matter? What are the implications? Separate actual news from commentary.

4. **Strongest Opinions & Narratives** (200+ words): What narratives are hosts pushing hardest? What opinions were expressed with conviction? Are there emerging consensus views forming? What's the "conventional wisdom" being established or challenged?

5. **People & Power** (150+ words): Which specific founders, CEOs, investors, or other figures were discussed substantively? What was said about them? Include direct quotes where available. Who's gaining influence? Who's being criticized?

6. **Contrarian Radar** (150+ words): Where do podcasters explicitly disagree with each other or with mainstream views? What's being called overrated or underrated? What counter-consensus positions were argued? What "hot takes" emerged?

7. **Forward-Looking** (150+ words): What specific predictions were made? What events, launches, or announcements are people watching for? What timelines were mentioned? What scenarios were discussed?

8. **Actionable Intel** (150+ words): What specific books, articles, papers, newsletters, or Twitter threads were recommended? What companies, funds, or investments were highlighted for further research? What specific metrics, data points, or statistics were cited?

9. **Vibe Check** (100+ words): What's the overall emotional tenor across these podcasts? Is there optimism, fear, greed, uncertainty, excitement, concern? How does today's mood compare to the broader sentiment in tech/VC? What's driving the current emotional state?

CRITICAL INSTRUCTIONS:
- Be substantive and detailed - this is a premium briefing, not a quick summary
- Use specific names, companies, numbers, and quotes wherever possible
- Each section must have multiple paragraphs or detailed bullet points
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

${transcriptSections}

Respond with a JSON object containing these fields. Each field should contain detailed markdown-formatted content:
{
  "topic_of_day": "200+ words on the dominant theme...",
  "unique_takes": "200+ words on differentiated perspectives...",
  "top_developments": "200+ words on 3-5 significant news items...",
  "strong_opinions": "200+ words on narratives being pushed...",
  "people_power": "150+ words on specific people discussed...",
  "contrarian_radar": "150+ words on disagreements and hot takes...",
  "forward_looking": "150+ words on predictions and what to watch...",
  "actionable_intel": "150+ words on recommendations and data...",
  "vibe_check": "100+ words on overall sentiment..."
}

Remember: This digest replaces listening to all these podcasts. Make it count.`;
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
