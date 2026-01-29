import { NextRequest, NextResponse } from 'next/server';
import { classifyMessage } from '@/lib/claude/client';
import { sendSMS } from '@/lib/telnyx/client';
import { parseTelnyxPayload } from '@/lib/telnyx/webhook';
import { createClient } from '@/lib/supabase/server';
import { isNoteData, isRolodexData } from '@/lib/claude/types';
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

    // Otherwise, classify the new message
    const classification = await classifyMessage(message);

    if (classification.type === 'note' && isNoteData(classification.data)) {
      // Create a note directly
      const { data: note, error } = await supabase
        .from('notes')
        .insert({
          content: message,
          category: classification.data.category,
          extracted_title: classification.data.extracted_title,
          extracted_context: classification.data.extracted_context,
          source_phone: phoneNumber,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        await sendSMS(phoneNumber, 'Sorry, there was an error saving your note. Please try again.');
        return NextResponse.json({ status: 'error', error: error.message });
      }

      // Send confirmation
      const title = classification.data.extracted_title || message.substring(0, 30);
      await sendSMS(
        phoneNumber,
        `Saved: "${title}${title.length >= 30 ? '...' : ''}" [${classification.data.category}]`
      );

      return NextResponse.json({ status: 'note_created', noteId: note.id });
    }

    if (classification.type === 'rolodex' && isRolodexData(classification.data)) {
      const { name, description, suggested_tags } = classification.data;
      const normalizedName = name.toLowerCase().trim();

      // Check for existing contact with same name
      const { data: existingContacts } = await supabase
        .from('rolodex')
        .select('*')
        .eq('name_normalized', normalizedName)
        .limit(1);

      if (existingContacts && existingContacts.length > 0) {
        // Found a duplicate - ask for clarification
        const existing = existingContacts[0];
        const expiresAt = new Date(Date.now() + CONVERSATION_TIMEOUT_MINUTES * 60 * 1000);

        // Save conversation state
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

        // Ask user about duplicate
        const existingDesc = existing.description?.substring(0, 50) || 'no description';
        await sendSMS(
          phoneNumber,
          `Found "${existing.name}": "${existingDesc}...". Same person? Reply YES to update, NO for new entry.`
        );

        return NextResponse.json({ status: 'awaiting_duplicate_response' });
      }

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
        await sendSMS(phoneNumber, 'Sorry, there was an error saving that contact. Please try again.');
        return NextResponse.json({ status: 'error', error: error.message });
      }

      await sendSMS(phoneNumber, `Saved contact: ${name}`);
      return NextResponse.json({ status: 'contact_created', contactId: contact.id });
    }

    // Fallback - shouldn't reach here normally
    return NextResponse.json({ status: 'unhandled', classification });

  } catch (error) {
    console.error('Webhook error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Handle GET requests for webhook verification (some services use this)
export async function GET() {
  return NextResponse.json({ status: 'webhook active' });
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
