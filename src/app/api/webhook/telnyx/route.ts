import { NextRequest, NextResponse } from 'next/server';
import { classifyMessage } from '@/lib/claude/client';
import { sendSMS } from '@/lib/telnyx/client';
import { parseTelnyxPayload } from '@/lib/telnyx/webhook';
import { createClient } from '@/lib/supabase/server';
import { isNoteData, isRolodexData, isCalendarData } from '@/lib/claude/types';
import { createCalendarEvent } from '@/lib/google/calendar';
import { isConnected } from '@/lib/google/oauth';
import type { ClassificationItem } from '@/lib/claude/types';
import type { TelnyxWebhookBody } from '@/lib/telnyx/types';
import type { ConversationStateType } from '@/types/database';

const CONVERSATION_TIMEOUT_MINUTES = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TelnyxWebhookBody;
    console.log('Telnyx webhook received:', JSON.stringify(body, null, 2));

    const payload = parseTelnyxPayload(body);
    console.log('Parsed payload:', JSON.stringify(payload, null, 2));

    // Only process inbound messages
    if (payload.eventType !== 'message.received') {
      console.log('Ignoring event type:', payload.eventType);
      return NextResponse.json({ status: 'ignored' });
    }

    const { from: phoneNumber, text: message } = payload;
    const supabase = createClient();

    // Check for existing conversation state
    const { data: existingState } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('phone_number', phoneNumber)
      .gt('expires_at', new Date().toISOString())
      .single();

    // If we're awaiting a duplicate response, handle it
    if (existingState?.state === 'awaiting_duplicate_response') {
      const result = await handleDuplicateResponse(
        supabase,
        phoneNumber,
        message,
        existingState
      );
      return NextResponse.json(result);
    }

    // Classify the message - may return multiple items
    const classifiedItems = await classifyMessage(message);
    console.log('Classified items:', JSON.stringify(classifiedItems, null, 2));

    // Process each classified item
    const results = await processClassifiedItems(supabase, phoneNumber, classifiedItems);

    // Send confirmation SMS
    await sendConfirmationSMS(phoneNumber, results);

    return NextResponse.json({ status: 'processed', results });

  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      error: 'Internal error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification (some services use this)
export async function GET() {
  return NextResponse.json({ status: 'webhook active' });
}

interface ProcessResult {
  type: 'note' | 'rolodex' | 'calendar' | 'duplicate_pending';
  id?: string;
  title?: string;
  category?: string;
  name?: string;
  error?: string;
  synced?: boolean;
  meetLink?: string;
  eventTime?: string;
}

async function processClassifiedItems(
  supabase: ReturnType<typeof createClient>,
  phoneNumber: string,
  items: ClassificationItem[]
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const item of items) {
    if (item.type === 'note' && isNoteData(item.data)) {
      const { data: note, error } = await supabase
        .from('notes')
        .insert({
          content: item.original_text,
          category: item.data.category,
          extracted_title: item.data.extracted_title,
          extracted_context: item.data.extracted_context,
          source_phone: phoneNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        results.push({ type: 'note', error: error.message });
      } else {
        results.push({
          type: 'note',
          id: note.id,
          title: item.data.extracted_title || item.original_text.substring(0, 30),
          category: item.data.category,
        });
      }
    } else if (item.type === 'calendar' && isCalendarData(item.data)) {
      // Handle calendar event
      const { title, date_expression, time_expression, duration_minutes, people, add_google_meet, description } = item.data;

      // Check if Google Calendar is connected
      const connectionStatus = await isConnected();

      if (!connectionStatus.connected) {
        // Store locally only, not synced
        const { data: event, error } = await supabase
          .from('calendar_events')
          .insert({
            title,
            event_date: new Date().toISOString().split('T')[0], // Will be parsed properly when synced
            event_time: '09:00', // Default time
            description: `Date: ${date_expression}, Time: ${time_expression}${description ? '\n' + description : ''}`,
            people: people || [],
            has_google_meet: add_google_meet || false,
            original_message: item.original_text,
            source_phone: phoneNumber,
            synced: false,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating local calendar event:', error);
          results.push({ type: 'calendar', error: error.message, title });
        } else {
          results.push({
            type: 'calendar',
            id: event.id,
            title,
            synced: false,
          });
        }
      } else {
        // Create on Google Calendar
        try {
          const googleEvent = await createCalendarEvent({
            title,
            dateExpression: date_expression,
            timeExpression: time_expression,
            durationMinutes: duration_minutes || 60,
            people: people || [],
            addGoogleMeet: add_google_meet || false,
            description,
          });

          // Store locally with Google event ID
          const { data: event, error } = await supabase
            .from('calendar_events')
            .insert({
              title,
              event_date: googleEvent.date,
              event_time: googleEvent.time,
              end_time: googleEvent.endTime,
              description,
              people: people || [],
              has_google_meet: !!googleEvent.meetLink,
              google_meet_link: googleEvent.meetLink || null,
              google_event_id: googleEvent.id,
              original_message: item.original_text,
              source_phone: phoneNumber,
              synced: true,
            })
            .select()
            .single();

          if (error) {
            console.error('Error storing calendar event locally:', error);
          }

          results.push({
            type: 'calendar',
            id: event?.id || googleEvent.id,
            title,
            synced: true,
            meetLink: googleEvent.meetLink,
            eventTime: `${googleEvent.date} ${googleEvent.time}`,
          });
        } catch (calendarError) {
          console.error('Error creating Google Calendar event:', calendarError);

          // Fallback: store locally without sync
          const { data: event } = await supabase
            .from('calendar_events')
            .insert({
              title,
              event_date: new Date().toISOString().split('T')[0],
              event_time: '09:00',
              description: `Date: ${date_expression}, Time: ${time_expression}${description ? '\n' + description : ''}`,
              people: people || [],
              has_google_meet: add_google_meet || false,
              original_message: item.original_text,
              source_phone: phoneNumber,
              synced: false,
            })
            .select()
            .single();

          results.push({
            type: 'calendar',
            id: event?.id,
            title,
            synced: false,
            error: 'Failed to sync with Google Calendar',
          });
        }
      }
    } else if (item.type === 'rolodex' && isRolodexData(item.data)) {
      const { name, description, suggested_tags } = item.data;
      const normalizedName = name.toLowerCase().trim();

      // Check for existing contact with same name
      const { data: existingContacts } = await supabase
        .from('rolodex')
        .select('*')
        .eq('name_normalized', normalizedName)
        .limit(1);

      if (existingContacts && existingContacts.length > 0) {
        // Found a duplicate - for multi-item messages, auto-append instead of asking
        // (to avoid complex multi-turn conversations)
        if (items.length > 1) {
          const existing = existingContacts[0];
          const updatedDescription = existing.description
            ? `${existing.description}\n---\n${description}`
            : description;

          const updatedTags = [...new Set([
            ...(existing.tags || []),
            ...(suggested_tags || [])
          ])];

          await supabase
            .from('rolodex')
            .update({
              description: updatedDescription,
              tags: updatedTags,
            })
            .eq('id', existing.id);

          results.push({
            type: 'rolodex',
            id: existing.id,
            name: name,
          });
        } else {
          // Single item - ask for clarification
          const existing = existingContacts[0];
          const expiresAt = new Date(Date.now() + CONVERSATION_TIMEOUT_MINUTES * 60 * 1000);

          await supabase
            .from('conversation_states')
            .upsert({
              phone_number: phoneNumber,
              state: 'awaiting_duplicate_response' as ConversationStateType,
              pending_action: 'create_contact',
              pending_data: { name, description, suggested_tags },
              related_record_id: existing.id,
              expires_at: expiresAt.toISOString(),
            }, {
              onConflict: 'phone_number',
            });

          const existingDesc = existing.description?.substring(0, 50) || 'no description';
          await sendSMS(
            phoneNumber,
            `Found "${existing.name}": "${existingDesc}...". Same person? Reply YES to update, NO for new entry.`
          );

          results.push({ type: 'duplicate_pending', name });
        }
      } else {
        // No duplicate - create new contact
        const { data: contact, error } = await supabase
          .from('rolodex')
          .insert({
            name,
            name_normalized: normalizedName,
            description,
            tags: suggested_tags || [],
            source_phone: phoneNumber,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating contact:', error);
          results.push({ type: 'rolodex', error: error.message, name });
        } else {
          results.push({ type: 'rolodex', id: contact.id, name });
        }
      }
    }
  }

  return results;
}

async function sendConfirmationSMS(phoneNumber: string, results: ProcessResult[]) {
  // Don't send confirmation if we're waiting for duplicate response
  if (results.some(r => r.type === 'duplicate_pending')) {
    // Only send confirmation for non-pending items
    const savedResults = results.filter(r => r.type !== 'duplicate_pending' && !r.error);
    if (savedResults.length === 0) return;

    const summaries = savedResults.map(r => formatResultSummary(r));
    await sendSMS(phoneNumber, `Saved: ${summaries.join(', ')}`);
    return;
  }

  // Build confirmation message
  const savedResults = results.filter(r => !r.error);
  const errorCount = results.filter(r => r.error).length;

  if (savedResults.length === 0) {
    await sendSMS(phoneNumber, 'Sorry, there was an error saving your items. Please try again.');
    return;
  }

  if (savedResults.length === 1) {
    const r = savedResults[0];
    const msg = formatSingleResultMessage(r);
    await sendSMS(phoneNumber, msg);
  } else {
    // Multiple items saved
    const summaries = savedResults.map(r => formatResultSummary(r));

    let msg = `Saved ${savedResults.length} items:\n${summaries.join('\n')}`;
    if (errorCount > 0) {
      msg += `\n(${errorCount} failed)`;
    }
    await sendSMS(phoneNumber, msg);
  }
}

function formatResultSummary(r: ProcessResult): string {
  if (r.type === 'note') {
    const shortTitle = (r.title || '').substring(0, 20);
    return `"${shortTitle}${shortTitle.length >= 20 ? '...' : ''}" [${r.category}]`;
  } else if (r.type === 'calendar') {
    if (r.synced) {
      return `"${r.title}" (calendar)${r.meetLink ? ' +Meet' : ''}`;
    } else {
      return `"${r.title}" (calendar, not synced)`;
    }
  } else {
    return `${r.name} (contact)`;
  }
}

function formatSingleResultMessage(r: ProcessResult): string {
  if (r.type === 'note') {
    const title = r.title || '';
    return `Saved: "${title}${title.length >= 30 ? '...' : ''}" [${r.category}]`;
  } else if (r.type === 'calendar') {
    if (r.synced) {
      let msg = `Added to calendar: "${r.title}"`;
      if (r.eventTime) {
        msg += ` - ${r.eventTime}`;
      }
      if (r.meetLink) {
        msg += `\nMeet: ${r.meetLink}`;
      }
      return msg;
    } else {
      return `Saved event: "${r.title}" (Connect Google Calendar in settings to sync)`;
    }
  } else {
    return `Saved contact: ${r.name}`;
  }
}

async function handleDuplicateResponse(
  supabase: ReturnType<typeof createClient>,
  phoneNumber: string,
  response: string,
  state: {
    pending_data: Record<string, unknown> | null;
    related_record_id: string | null;
  }
) {
  const normalizedResponse = response.toUpperCase().trim();
  const pendingData = state.pending_data as {
    name: string;
    description: string;
    suggested_tags?: string[];
  } | null;

  // Clear conversation state regardless of outcome
  await supabase
    .from('conversation_states')
    .delete()
    .eq('phone_number', phoneNumber);

  if (!pendingData) {
    await sendSMS(phoneNumber, 'Session expired. Please send your message again.');
    return { status: 'session_expired' };
  }

  if (normalizedResponse === 'YES' || normalizedResponse === 'Y') {
    // Update existing contact - append description
    const { data: existing } = await supabase
      .from('rolodex')
      .select('*')
      .eq('id', state.related_record_id)
      .single();

    if (existing) {
      const updatedDescription = existing.description
        ? `${existing.description}\n---\n${pendingData.description}`
        : pendingData.description;

      const updatedTags = [...new Set([
        ...(existing.tags || []),
        ...(pendingData.suggested_tags || [])
      ])];

      await supabase
        .from('rolodex')
        .update({
          description: updatedDescription,
          tags: updatedTags,
        })
        .eq('id', state.related_record_id);

      await sendSMS(phoneNumber, `Updated ${pendingData.name} with new info.`);
      return { status: 'contact_updated' };
    }
  }

  if (normalizedResponse === 'NO' || normalizedResponse === 'N') {
    // Create as new entry
    const { data: contact, error } = await supabase
      .from('rolodex')
      .insert({
        name: pendingData.name,
        name_normalized: pendingData.name.toLowerCase().trim(),
        description: pendingData.description,
        tags: pendingData.suggested_tags || [],
        source_phone: phoneNumber,
      })
      .select()
      .single();

    if (error) {
      await sendSMS(phoneNumber, 'Error creating contact. Please try again.');
      return { status: 'error', error: error.message };
    }

    await sendSMS(phoneNumber, `Created new entry for ${pendingData.name}.`);
    return { status: 'contact_created', contactId: contact.id };
  }

  // Unrecognized response
  await sendSMS(phoneNumber, 'Please reply YES or NO. Or send a new message to start over.');

  // Re-save state for another attempt
  const expiresAt = new Date(Date.now() + CONVERSATION_TIMEOUT_MINUTES * 60 * 1000);
  await supabase
    .from('conversation_states')
    .upsert({
      phone_number: phoneNumber,
      state: 'awaiting_duplicate_response' as ConversationStateType,
      pending_action: 'create_contact',
      pending_data: pendingData,
      related_record_id: state.related_record_id,
      expires_at: expiresAt.toISOString(),
    }, {
      onConflict: 'phone_number',
    });

  return { status: 'awaiting_response' };
}
