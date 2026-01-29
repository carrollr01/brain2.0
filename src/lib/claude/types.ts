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
