import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchTranscriptsForPodcasts } from '@/lib/podcast';
import { synthesizeDigest } from '@/lib/claude/digest';
import { sendSMS } from '@/lib/telnyx/client';

// Vercel cron job endpoint
// Configure in vercel.json with cron: "0 11 * * *" for 11 AM daily
export const maxDuration = 300; // 5 minutes max for transcript fetching and synthesis

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return generateDigest();
}

// POST for manual triggers
export async function POST(request: NextRequest) {
  // Check for API key or secret for manual triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return generateDigest();
}

async function generateDigest() {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if digest already exists for today
    const { data: existingDigest } = await supabase
      .from('digests')
      .select('id')
      .eq('date', today)
      .single();

    if (existingDigest) {
      return NextResponse.json(
        { message: 'Digest already exists for today', id: existingDigest.id },
        { status: 200 }
      );
    }

    // Get active podcasts
    const { data: podcasts, error: podcastError } = await supabase
      .from('podcasts')
      .select('id, name, rss_url')
      .eq('active', true);

    if (podcastError) {
      throw new Error(`Failed to fetch podcasts: ${podcastError.message}`);
    }

    if (!podcasts || podcasts.length === 0) {
      return NextResponse.json({ error: 'No active podcasts configured' }, { status: 400 });
    }

    // Fetch transcripts from the last 24 hours
    const since = new Date();
    since.setHours(since.getHours() - 24);

    console.log(`Fetching transcripts for ${podcasts.length} podcasts since ${since.toISOString()}`);

    const transcripts = await fetchTranscriptsForPodcasts(podcasts, since);

    console.log(`Found ${transcripts.length} episode transcripts`);

    // Synthesize digest using Claude
    const digestData = await synthesizeDigest(transcripts);

    // Store digest in database
    const { data: newDigest, error: insertError } = await supabase
      .from('digests')
      .insert({
        date: today,
        ...digestData,
        podcasts_included: [...new Set(transcripts.map(t => t.podcastName))],
        episode_count: transcripts.length,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save digest: ${insertError.message}`);
    }

    // Send SMS notification if phone number configured
    const notifyPhone = process.env.NOTIFY_PHONE_NUMBER;
    if (notifyPhone) {
      await sendSMS(
        notifyPhone,
        `Your podcast digest is ready! ${transcripts.length} episodes analyzed. Check your dashboard.`
      );
    }

    return NextResponse.json({
      message: 'Digest generated successfully',
      digest: newDigest,
      episodesProcessed: transcripts.length,
    });
  } catch (error) {
    console.error('Digest generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate digest' },
      { status: 500 }
    );
  }
}
