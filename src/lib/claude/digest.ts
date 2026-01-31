import Anthropic from '@anthropic-ai/sdk';
import type { PodcastTranscript } from '@/lib/podcast/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

const DIGEST_SYSTEM_PROMPT = `You are an expert podcast analyst specializing in tech, venture capital, and investing content. Your job is to synthesize multiple podcast transcripts into a comprehensive daily digest.

Analyze the provided transcripts and extract insights across these dimensions:

1. **Topic of the Day**: What is everyone talking about? Common themes across multiple podcasts.

2. **Unique Takes**: What views are only one or few podcasters expressing? Differentiated perspectives worth noting.

3. **Top 3-5 Developments**: Biggest news, updates, or events. What actually happened vs. commentary.

4. **Strongest Opinions & Narratives**: What are people pushing hard on? Emerging or dominant narratives.

5. **People & Power**: Which founders, CEOs, investors were discussed? Notable quotes attributed to specific people.

6. **Contrarian Radar**: Where do podcasters disagree? What's being called overrated/underrated? Counter-consensus views.

7. **Forward-Looking**: Predictions made. Events, launches, announcements people are watching for.

8. **Actionable Intel**: Books, articles, papers, threads recommended. Companies/funds to research. Specific data points cited.

9. **Vibe Check**: Overall sentiment - optimistic, cautious, bearish, uncertain? Is there fear or greed? General mood.

Be concise but thorough. Use bullet points within each section. Focus on signal over noise.`;

function buildUserPrompt(transcripts: PodcastTranscript[]): string {
  const transcriptSections = transcripts.map((t, i) =>
    `--- PODCAST ${i + 1}: ${t.podcastName} ---
Episode: ${t.episodeTitle}
Published: ${t.publishedAt}

${t.transcript.slice(0, 50000)}` // Limit each transcript to avoid token limits
  ).join('\n\n');

  return `Analyze the following ${transcripts.length} podcast transcripts and create a comprehensive daily digest.

${transcriptSections}

Respond with a JSON object containing these fields (all strings with markdown formatting allowed):
- topic_of_day
- unique_takes
- top_developments
- strong_opinions
- people_power
- contrarian_radar
- forward_looking
- actionable_intel
- vibe_check

Each field should contain well-formatted content with bullet points where appropriate.`;
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

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
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
