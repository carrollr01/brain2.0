import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchNewslettersFromGmail, htmlToPlainText } from '@/lib/google/gmail';
import { summarizeNewsletter } from '@/lib/claude/newsletter';

export const maxDuration = 300; // 5 minutes for fetching + summarizing

// GET for cron job
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return syncNewsletters();
}

// POST for manual "Sync Now" button
export async function POST() {
  return syncNewsletters();
}

async function syncNewsletters() {
  try {
    const supabase = createClient();

    // 1. Verify Google connection and Gmail scope
    let messages;
    try {
      messages = await fetchNewslettersFromGmail();
    } catch (gmailError) {
      console.error('Gmail fetch error:', gmailError);
      const errorMessage = gmailError instanceof Error ? gmailError.message : 'Failed to fetch from Gmail';
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json({ message: 'No new newsletters found', count: 0 });
    }

    // 2. Get sources map for linking
    const { data: sources } = await supabase
      .from('newsletter_sources')
      .select('id, sender_email');
    const sourceMap = new Map(
      (sources || []).map((s: { id: string; sender_email: string }) => [s.sender_email.toLowerCase(), s.id])
    );

    // 3. Process each message: store + summarize
    let processed = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      // Get plain text for summarization
      const textContent = msg.textBody || (msg.htmlBody ? htmlToPlainText(msg.htmlBody) : '');

      // Generate AI summary
      let summary: string | null = null;
      if (textContent.length > 100) {
        try {
          summary = await summarizeNewsletter(msg.subject, textContent);
        } catch (err) {
          console.error(`Failed to summarize newsletter "${msg.subject}":`, err);
          errors.push(`Summary failed for "${msg.subject}": ${err instanceof Error ? err.message : 'unknown'}`);
          // Continue without summary -- can be retried later
        }
      }

      // Find matching source
      const sourceId = sourceMap.get(msg.senderEmail.toLowerCase()) || null;

      // Insert into database
      const { error: insertError } = await supabase
        .from('newsletters')
        .insert({
          source_id: sourceId,
          gmail_message_id: msg.id,
          subject: msg.subject,
          sender: msg.sender,
          content_html: msg.htmlBody,
          content_text: textContent || null,
          summary,
          received_at: msg.receivedAt,
          is_read: false,
        });

      if (insertError) {
        // Skip duplicates silently (unique constraint on gmail_message_id)
        if (insertError.code === '23505') continue;
        console.error(`Failed to insert newsletter "${msg.subject}":`, insertError);
        errors.push(`Insert failed for "${msg.subject}": ${insertError.message}`);
        continue;
      }

      processed++;
    }

    return NextResponse.json({
      message: `Synced ${processed} new newsletter${processed !== 1 ? 's' : ''}`,
      count: processed,
      total_found: messages.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Newsletter sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync newsletters' },
      { status: 500 }
    );
  }
}
