import { google } from 'googleapis';
import * as chrono from 'chrono-node';
import { getValidTokens, getAuthorizedOAuth2Client } from './oauth';
import type { CalendarEventInput, CalendarEventResult } from './types';

/**
 * Normalize casual time/date expressions to formats chrono-node understands
 */
function normalizeTimeExpression(expr: string): string {
  let normalized = expr.toLowerCase().trim();

  // Time format fixes
  // "6p" -> "6pm", "630p" -> "630pm", "6:30p" -> "6:30pm"
  normalized = normalized.replace(/(\d)p\b/g, '$1pm');
  normalized = normalized.replace(/(\d)a\b/g, '$1am');

  // "630pm" -> "6:30pm" (add colon for 3-4 digit times)
  normalized = normalized.replace(/\b(\d{1,2})(\d{2})(am|pm)\b/g, '$1:$2$3');

  // Spelled out numbers for common times
  const numberWords: Record<string, string> = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'eleven': '11', 'twelve': '12', 'noon': '12pm', 'midnight': '12am'
  };
  for (const [word, num] of Object.entries(numberWords)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), num);
  }

  // Date abbreviations
  normalized = normalized.replace(/\btom\b/g, 'tomorrow');
  normalized = normalized.replace(/\btmw\b/g, 'tomorrow');
  normalized = normalized.replace(/\b2nite\b/g, 'tonight');
  normalized = normalized.replace(/\btonite\b/g, 'tonight');

  // Day abbreviations
  normalized = normalized.replace(/\bmon\b/g, 'monday');
  normalized = normalized.replace(/\btues?\b/g, 'tuesday');
  normalized = normalized.replace(/\bwed\b/g, 'wednesday');
  normalized = normalized.replace(/\bthurs?\b/g, 'thursday');
  normalized = normalized.replace(/\bfri\b/g, 'friday');
  normalized = normalized.replace(/\bsat\b/g, 'saturday');
  normalized = normalized.replace(/\bsun\b/g, 'sunday');

  return normalized;
}

export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  console.log('Creating calendar event with input:', JSON.stringify(input));

  const tokens = await getValidTokens();
  console.log('Got tokens:', tokens ? 'yes' : 'no');

  if (!tokens) {
    throw new Error('Google Calendar not connected');
  }

  const oauth2Client = getAuthorizedOAuth2Client(tokens.access_token);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Parse the date and time using chrono-node
  const { startDateTime, endDateTime } = parseDateTime(
    input.dateExpression,
    input.timeExpression,
    input.durationMinutes || 60
  );

  // Use America/New_York as default timezone for serverless environment
  const timeZone = 'America/New_York';

  // Format datetime for Google Calendar (local time, not UTC)
  // Google Calendar will interpret this in the context of the timeZone we specify
  const formatForGoogle = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  console.log('Formatted start for Google:', formatForGoogle(startDateTime));
  console.log('Formatted end for Google:', formatForGoogle(endDateTime));

  // Build the event object
  const event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { email: string }[];
    conferenceData?: {
      createRequest: {
        requestId: string;
        conferenceSolutionKey: { type: string };
      };
    };
  } = {
    summary: input.title,
    description: input.description || undefined,
    start: {
      dateTime: formatForGoogle(startDateTime),
      timeZone,
    },
    end: {
      dateTime: formatForGoogle(endDateTime),
      timeZone,
    },
  };

  // Add attendees if people are specified
  // Note: This requires their email addresses, so we'll just add them to description for now
  if (input.people && input.people.length > 0) {
    const peopleList = input.people.join(', ');
    event.description = event.description
      ? `${event.description}\n\nWith: ${peopleList}`
      : `With: ${peopleList}`;
  }

  // Add Google Meet if requested
  if (input.addGoogleMeet) {
    event.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  // Create the event
  console.log('Inserting event:', JSON.stringify(event));
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: input.addGoogleMeet ? 1 : 0,
  });
  console.log('Calendar API response:', JSON.stringify(response.data));

  const createdEvent = response.data;

  if (!createdEvent.id) {
    throw new Error('Failed to create calendar event');
  }

  // Extract the meet link if available
  const meetLink = createdEvent.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri;

  return {
    id: createdEvent.id,
    title: createdEvent.summary || input.title,
    date: startDateTime.toISOString().split('T')[0],
    time: formatTime(startDateTime),
    endTime: formatTime(endDateTime),
    meetLink: meetLink || undefined,
    htmlLink: createdEvent.htmlLink || '',
  };
}

function parseDateTime(
  dateExpression: string,
  timeExpression: string,
  durationMinutes: number
): { startDateTime: Date; endDateTime: Date } {
  // Get current time in Eastern timezone as reference
  // This ensures "tomorrow" is interpreted correctly regardless of server timezone
  const nowUtc = new Date();

  // Get Eastern time components
  const easternFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = easternFormatter.formatToParts(nowUtc);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';

  // Create a reference date that chrono will interpret as "now" in Eastern time
  const easternNow = new Date(
    parseInt(getPart('year')),
    parseInt(getPart('month')) - 1,
    parseInt(getPart('day')),
    parseInt(getPart('hour')),
    parseInt(getPart('minute')),
    parseInt(getPart('second'))
  );

  // Normalize casual expressions before parsing
  const normalizedDate = normalizeTimeExpression(dateExpression);
  const normalizedTime = normalizeTimeExpression(timeExpression);

  console.log('Server UTC:', nowUtc.toISOString());
  console.log('Eastern reference:', easternNow.toString());
  console.log('Original - Date:', dateExpression, 'Time:', timeExpression);
  console.log('Normalized - Date:', normalizedDate, 'Time:', normalizedTime);

  // Combine date and time expressions for parsing
  const combined = `${normalizedDate} ${normalizedTime}`;

  // Parse with chrono-node using Eastern time as reference
  const parsed = chrono.parseDate(combined, easternNow, { forwardDate: true });

  console.log('Chrono parsed:', parsed?.toString());

  if (!parsed) {
    // Fallback: try parsing just the time for today
    const timeOnly = chrono.parseDate(normalizedTime, easternNow);
    if (timeOnly) {
      const dateOnly = chrono.parseDate(normalizedDate, easternNow, { forwardDate: true });
      if (dateOnly) {
        const result = new Date(dateOnly);
        result.setHours(timeOnly.getHours());
        result.setMinutes(timeOnly.getMinutes());
        result.setSeconds(0);
        result.setMilliseconds(0);

        console.log('Fallback combined result:', result.toString());
        const endDateTime = new Date(result.getTime() + durationMinutes * 60 * 1000);
        return { startDateTime: result, endDateTime };
      }
    }

    // Ultimate fallback: today at the parsed time, or 9am
    console.log('Using ultimate fallback');
    const fallbackTime = chrono.parseDate(normalizedTime, easternNow) || new Date(easternNow.setHours(9, 0, 0, 0));
    const endDateTime = new Date(fallbackTime.getTime() + durationMinutes * 60 * 1000);
    return { startDateTime: fallbackTime, endDateTime };
  }

  const startDateTime = parsed;
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  console.log('Final start:', startDateTime.toString(), 'end:', endDateTime.toString());

  return { startDateTime, endDateTime };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export async function deleteCalendarEvent(googleEventId: string): Promise<void> {
  const tokens = await getValidTokens();

  if (!tokens) {
    throw new Error('Google Calendar not connected');
  }

  const oauth2Client = getAuthorizedOAuth2Client(tokens.access_token);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId,
  });
}

export async function updateCalendarEvent(
  googleEventId: string,
  input: Partial<CalendarEventInput>
): Promise<CalendarEventResult> {
  const tokens = await getValidTokens();

  if (!tokens) {
    throw new Error('Google Calendar not connected');
  }

  const oauth2Client = getAuthorizedOAuth2Client(tokens.access_token);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get existing event
  const existingResponse = await calendar.events.get({
    calendarId: 'primary',
    eventId: googleEventId,
  });

  const existingEvent = existingResponse.data;

  // Build updates
  const updates: Record<string, unknown> = {};

  if (input.title) {
    updates.summary = input.title;
  }

  if (input.dateExpression && input.timeExpression) {
    const { startDateTime, endDateTime } = parseDateTime(
      input.dateExpression,
      input.timeExpression,
      input.durationMinutes || 60
    );

    updates.start = {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/New_York',
    };
    updates.end = {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/New_York',
    };
  }

  if (input.description !== undefined) {
    updates.description = input.description;
  }

  // Update the event
  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId: googleEventId,
    requestBody: updates,
  });

  const updatedEvent = response.data;

  const startDateTime = new Date(
    (updatedEvent.start?.dateTime as string) || existingEvent.start?.dateTime || new Date()
  );
  const endDateTime = new Date(
    (updatedEvent.end?.dateTime as string) || existingEvent.end?.dateTime || new Date()
  );

  const meetLink = updatedEvent.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video'
  )?.uri;

  return {
    id: updatedEvent.id || googleEventId,
    title: updatedEvent.summary || input.title || '',
    date: startDateTime.toISOString().split('T')[0],
    time: formatTime(startDateTime),
    endTime: formatTime(endDateTime),
    meetLink: meetLink || undefined,
    htmlLink: updatedEvent.htmlLink || '',
  };
}
