export type NoteCategory =
  | 'movie'
  | 'book'
  | 'idea'
  | 'task'
  | 'plan'
  | 'recommendation'
  | 'quote'
  | 'other';

export interface Note {
  id: string;
  content: string;
  category: NoteCategory;
  extracted_title: string | null;
  extracted_context: string | null;
  source_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  name_normalized: string;
  description: string | null;
  tags: string[];
  source_phone: string | null;
  created_at: string;
  updated_at: string;
}

export type ConversationStateType =
  | 'idle'
  | 'awaiting_duplicate_response'
  | 'awaiting_confirmation';

export type PendingAction =
  | 'create_note'
  | 'create_contact'
  | 'update_contact'
  | 'merge_contact';

export interface ConversationState {
  id: string;
  phone_number: string;
  state: ConversationStateType;
  pending_action: PendingAction | null;
  pending_data: Record<string, unknown> | null;
  related_record_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  google_event_id: string | null;
  title: string;
  event_date: string;
  event_time: string;
  end_time: string | null;
  description: string | null;
  people: string[];
  has_google_meet: boolean;
  google_meet_link: string | null;
  original_message: string;
  source_phone: string | null;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoogleOAuthToken {
  id: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  scope: string;
  google_email: string | null;
  created_at: string;
  updated_at: string;
}
