import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecentEpisodes } from '@/lib/podcast/rss';

// Debug endpoint to test each step of the pipeline
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    steps: {},
  };

  try {
    // Step 1: Check environment variables
    results.steps = {
      ...results.steps as object,
      env: {
        ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY ? 'SET' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
      },
    };

    // Step 2: Check database connection and podcasts
    const supabase = createClient();
    const { data: podcasts, error: podcastError } = await supabase
      .from('podcasts')
      .select('id, name, rss_url')
      .eq('active', true)
      .limit(3);

    results.steps = {
      ...results.steps as object,
      database: {
        connected: !podcastError,
        error: podcastError?.message || null,
        podcastCount: podcasts?.length || 0,
        podcasts: podcasts?.map(p => ({ id: p.id, name: p.name })) || [],
      },
    };

    if (!podcasts || podcasts.length === 0) {
      return NextResponse.json(results);
    }

    // Step 3: Test RSS feed parsing for first podcast
    const testPodcast = podcasts[0];
    try {
      // Test direct fetch first
      const rawResponse = await fetch(testPodcast.rss_url, {
        headers: {
          'User-Agent': 'SecondBrain/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });
      const rawXml = await rawResponse.text();

      // Count items in raw XML
      const itemMatches = rawXml.match(/<item>/gi);
      const enclosureMatches = rawXml.match(/<enclosure/gi);

      // No date filter - just get most recent
      const episodes = await getRecentEpisodes(testPodcast.rss_url, null, 3);

      results.steps = {
        ...results.steps as object,
        rssFeed: {
          podcast: testPodcast.name,
          url: testPodcast.rss_url,
          rawXmlLength: rawXml.length,
          rawItemCount: itemMatches?.length || 0,
          rawEnclosureCount: enclosureMatches?.length || 0,
          episodesFound: episodes.length,
          episodes: episodes.map(e => ({
            title: e.title,
            guid: e.guid,
            pubDate: e.pubDate,
            hasAudioUrl: !!e.audioUrl,
            audioUrl: e.audioUrl?.substring(0, 100) + '...',
          })),
        },
      };
    } catch (rssError) {
      results.steps = {
        ...results.steps as object,
        rssFeed: {
          podcast: testPodcast.name,
          error: rssError instanceof Error ? rssError.message : 'Unknown error',
          stack: rssError instanceof Error ? rssError.stack : undefined,
        },
      };
    }

    // Step 4: Check episode_transcripts table
    const { data: transcripts, error: transcriptError } = await supabase
      .from('episode_transcripts')
      .select('id, podcast_id, episode_title, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    results.steps = {
      ...results.steps as object,
      cachedTranscripts: {
        error: transcriptError?.message || null,
        count: transcripts?.length || 0,
        recent: transcripts?.map(t => ({
          title: t.episode_title,
          created: t.created_at,
        })) || [],
      },
    };

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      ...results,
      fatalError: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
