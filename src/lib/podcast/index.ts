import { getRecentEpisodes } from './rss';
import { transcribeAudio } from './groq';
import type { PodcastTranscript, RSSEpisode } from './types';

export * from './types';
export * from './rss';
export * from './groq';

interface Podcast {
  id: string;
  name: string;
  rss_url: string;
}

export async function fetchTranscriptsForPodcasts(
  podcasts: Podcast[],
  since: Date
): Promise<PodcastTranscript[]> {
  const transcripts: PodcastTranscript[] = [];

  for (const podcast of podcasts) {
    try {
      console.log(`Fetching episodes for ${podcast.name}...`);

      const episodes = await getRecentEpisodes(podcast.rss_url, since, 2);
      console.log(`Found ${episodes.length} recent episodes for ${podcast.name}`);

      for (const episode of episodes) {
        try {
          console.log(`Transcribing: ${episode.title}`);

          const result = await transcribeAudio(episode.audioUrl);

          transcripts.push({
            podcastName: podcast.name,
            episodeTitle: episode.title,
            publishedAt: episode.pubDate,
            transcript: result.text,
            audioUrl: episode.audioUrl,
          });

          console.log(`Successfully transcribed: ${episode.title}`);
        } catch (error) {
          console.error(`Failed to transcribe ${episode.title}:`, error);
          // Continue with other episodes
        }
      }
    } catch (error) {
      console.error(`Failed to fetch episodes for ${podcast.name}:`, error);
      // Continue with other podcasts
    }
  }

  return transcripts;
}
