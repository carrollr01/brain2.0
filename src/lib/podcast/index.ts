import { getRecentEpisodes } from './rss';
import { transcribeAudio } from './assemblyai';
import type { PodcastTranscript, RSSEpisode } from './types';
import { createClient } from '@supabase/supabase-js';

export * from './types';
export * from './rss';
export * from './assemblyai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Podcast {
  id: string;
  name: string;
  rss_url: string;
}

// Save a transcript to the cache
async function cacheTranscript(
  podcastId: string,
  episode: RSSEpisode,
  transcript: string,
  source: 'assemblyai' | 'rss'
): Promise<void> {
  const { error } = await supabase.from('episode_transcripts').upsert(
    {
      podcast_id: podcastId,
      episode_guid: episode.guid,
      episode_title: episode.title,
      episode_url: episode.audioUrl,
      published_at: new Date(episode.pubDate).toISOString(),
      transcript,
      transcript_source: source,
    },
    { onConflict: 'podcast_id,episode_guid' }
  );

  if (error) {
    console.error('Failed to cache transcript:', error);
  }
}

// Get cached transcript from database
async function getCachedTranscript(
  podcastId: string,
  episodeGuid: string
): Promise<string | null> {
  const { data } = await supabase
    .from('episode_transcripts')
    .select('transcript')
    .eq('podcast_id', podcastId)
    .eq('episode_guid', episodeGuid)
    .single();

  return data?.transcript || null;
}

// Get the latest episode for a podcast (cached or new)
async function getLatestEpisodeTranscript(
  podcast: Podcast
): Promise<PodcastTranscript | null> {
  try {
    console.log(`Checking ${podcast.name} for episodes...`);

    // Get the most recent episode from RSS
    const episodes = await getRecentEpisodes(podcast.rss_url, null, 1);

    if (episodes.length === 0) {
      console.log(`No episodes found for ${podcast.name}`);
      return null;
    }

    const episode = episodes[0];
    console.log(`Latest episode: ${episode.title}`);

    // Check if we already have this transcript cached
    const cachedTranscript = await getCachedTranscript(podcast.id, episode.guid);
    if (cachedTranscript) {
      console.log(`Using cached transcript for: ${episode.title}`);
      return {
        podcastName: podcast.name,
        episodeTitle: episode.title,
        publishedAt: episode.pubDate,
        transcript: cachedTranscript,
        audioUrl: episode.audioUrl,
      };
    }

    // Not cached - transcribe it
    console.log(`Transcribing with AssemblyAI: ${episode.title}`);
    const result = await transcribeAudio(episode.audioUrl);
    await cacheTranscript(podcast.id, episode, result.text, 'assemblyai');

    return {
      podcastName: podcast.name,
      episodeTitle: episode.title,
      publishedAt: episode.pubDate,
      transcript: result.text,
      audioUrl: episode.audioUrl,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to get episode for ${podcast.name}: ${errorMsg}`);
    return null;
  }
}

export async function fetchTranscriptsForPodcasts(
  podcasts: Podcast[]
): Promise<PodcastTranscript[]> {
  console.log(`Fetching transcripts for ${podcasts.length} podcasts...`);

  // Get the latest episode transcript for each podcast in parallel
  const results = await Promise.all(
    podcasts.map((podcast) => getLatestEpisodeTranscript(podcast))
  );

  // Filter out nulls (failed podcasts)
  const transcripts = results.filter(
    (r): r is PodcastTranscript => r !== null
  );

  console.log(`Successfully got ${transcripts.length} transcripts`);
  return transcripts;
}
