import type { NoteCategory } from '@/types/database';

export interface NoteClassificationData {
  category: NoteCategory;
  extracted_title: string | null;
  extracted_context: string | null;
}

export interface RolodexClassificationData {
  name: string;
  description: string;
  suggested_tags: string[];
}

export interface CalendarClassificationData {
  title: string;
  date_expression: string;      // "tomorrow", "Friday", "Jan 15"
  time_expression: string;      // "3pm", "10:30am", "noon"
  duration_minutes: number;     // Default 60
  people: string[];             // Extracted names
  add_google_meet: boolean;     // If message mentions video call/zoom/meet
  description: string | null;
}

export type ClassificationData =
  | NoteClassificationData
  | RolodexClassificationData
  | CalendarClassificationData;

export interface ClassificationItem {
  type: 'note' | 'rolodex' | 'calendar';
  confidence: number;
  original_text: string;
  data: ClassificationData;
}

export interface ClassificationResponse {
  items: ClassificationItem[];
}

// Legacy single-item result (kept for backwards compatibility)
export interface ClassificationResult {
  type: 'note' | 'rolodex' | 'calendar';
  confidence: number;
  data: ClassificationData;
}

export function isNoteData(data: ClassificationData): data is NoteClassificationData {
  return 'category' in data;
}

export function isRolodexData(data: ClassificationData): data is RolodexClassificationData {
  return 'name' in data && 'description' in data && !('date_expression' in data);
}

export function isCalendarData(data: ClassificationData): data is CalendarClassificationData {
  return 'date_expression' in data && 'time_expression' in data;
}
