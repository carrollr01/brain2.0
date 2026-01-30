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

export interface ClassificationItem {
  type: 'note' | 'rolodex';
  confidence: number;
  original_text: string;
  data: NoteClassificationData | RolodexClassificationData;
}

export interface ClassificationResponse {
  items: ClassificationItem[];
}

// Legacy single-item result (kept for backwards compatibility)
export interface ClassificationResult {
  type: 'note' | 'rolodex';
  confidence: number;
  data: NoteClassificationData | RolodexClassificationData;
}

export function isNoteData(data: NoteClassificationData | RolodexClassificationData): data is NoteClassificationData {
  return 'category' in data;
}

export function isRolodexData(data: NoteClassificationData | RolodexClassificationData): data is RolodexClassificationData {
  return 'name' in data && 'description' in data;
}
