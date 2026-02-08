import { google, gmail_v1 } from 'googleapis';
import { getValidTokens, getAuthorizedOAuth2Client, hasGmailScope } from './oauth';
import { createClient } from '@/lib/supabase/server';

export interface GmailMessage {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  htmlBody: string | null;
  textBody: string | null;
  receivedAt: string;
}

/**
 * Fetch newsletters from Gmail for the configured sources.
 * Uses the Gmail API messages.list + messages.get flow.
 */
export async function fetchNewslettersFromGmail(): Promise<GmailMessage[]> {
  // 1. Get valid OAuth tokens
  const tokens = await getValidTokens();
  if (!tokens) {
    throw new Error('Google not connected. Please connect Google in Settings.');
  }
  if (!hasGmailScope(tokens.scope)) {
    throw new Error('Gmail access not granted. Please disconnect and reconnect Google in Settings to grant Gmail permissions.');
  }

  // 2. Get active newsletter sources from DB
  const supabase = createClient();
  const { data: sources } = await supabase
    .from('newsletter_sources')
    .select('*')
    .eq('active', true);

  if (!sources || sources.length === 0) {
    return [];
  }

  // 3. Build Gmail query string from sources
  // e.g., "from:newsletter@stratechery.com OR from:hello@morning.com"
  const fromQuery = sources
    .map((s: { sender_email: string }) => `from:${s.sender_email}`)
    .join(' OR ');

  // 4. Get already-fetched Gmail message IDs to skip duplicates
  const { data: existing } = await supabase
    .from('newsletters')
    .select('gmail_message_id');
  const existingIds = new Set((existing || []).map((e: { gmail_message_id: string }) => e.gmail_message_id));

  // 5. Create Gmail client and list messages
  const oauth2Client = getAuthorizedOAuth2Client(tokens.access_token);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: fromQuery,
    maxResults: 50,
  });

  const messageRefs = listResponse.data.messages || [];

  // 6. Filter out already-fetched messages
  const newMessageRefs = messageRefs.filter(m => m.id && !existingIds.has(m.id));

  // 7. Fetch full message content for each new message
  const messages: GmailMessage[] = [];
  for (const ref of newMessageRefs) {
    if (!ref.id) continue;
    try {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: ref.id,
        format: 'full',
      });
      messages.push(parseGmailMessage(ref.id, msg.data));
    } catch (err) {
      console.error(`Failed to fetch Gmail message ${ref.id}:`, err);
      // Skip individual message failures
    }
  }

  return messages;
}

/**
 * Parse a Gmail API message object into our simplified structure.
 */
function parseGmailMessage(messageId: string, message: gmail_v1.Schema$Message): GmailMessage {
  const headers = message.payload?.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';

  // Extract sender email from "Name <email>" format
  const emailMatch = from.match(/<(.+)>/);
  const senderEmail = emailMatch ? emailMatch[1] : from;

  // Extract body parts (handle multipart messages)
  const { htmlBody, textBody } = extractBodyParts(message.payload);

  return {
    id: messageId,
    subject,
    sender: from,
    senderEmail,
    htmlBody,
    textBody,
    receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
  };
}

/**
 * Recursively extract HTML and text body parts from Gmail message payload.
 * Gmail messages can be deeply nested multipart structures.
 */
function extractBodyParts(payload: gmail_v1.Schema$MessagePart | null | undefined): { htmlBody: string | null; textBody: string | null } {
  let htmlBody: string | null = null;
  let textBody: string | null = null;

  if (!payload) return { htmlBody, textBody };

  // Direct body
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    if (payload.mimeType === 'text/html') htmlBody = decoded;
    if (payload.mimeType === 'text/plain') textBody = decoded;
  }

  // Multipart: recurse into parts
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBodyParts(part);
      if (result.htmlBody && !htmlBody) htmlBody = result.htmlBody;
      if (result.textBody && !textBody) textBody = result.textBody;
    }
  }

  return { htmlBody, textBody };
}

/**
 * Strip HTML tags to get plain text for AI summarization.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}
