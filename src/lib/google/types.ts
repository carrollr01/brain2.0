export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: Date;
  scope: string;
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
}

export interface CalendarEventInput {
  title: string;
  dateExpression: string;
  timeExpression: string;
  durationMinutes?: number;
  people?: string[];
  addGoogleMeet?: boolean;
  description?: string | null;
}

export interface CalendarEventResult {
  id: string;
  title: string;
  date: string;       // ISO date string
  time: string;       // HH:mm format
  endTime: string;    // HH:mm format
  meetLink?: string;
  htmlLink: string;   // Link to view event in Google Calendar
}
