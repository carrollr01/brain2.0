'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Note, NoteCategory } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

const categoryColors: Record<NoteCategory, string> = {
  movie: '#ff6b6b',
  book: '#4ecdc4',
  idea: '#ffe66d',
  task: '#95e1d3',
  plan: '#a29bfe',
  recommendation: '#fd79a8',
  quote: '#fdcb6e',
  other: '#636e72',
};

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const timeAgo = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
  });

  return (
    <Card onClick={onClick} accentColor={categoryColors[note.category]}>
      <div className="flex justify-between items-start mb-2">
        <Badge category={note.category} size="sm" />
        <span className="text-xs text-[var(--terminal-muted)]">{timeAgo}</span>
      </div>

      {note.extracted_title && (
        <h3 className="text-[var(--terminal-text)] font-semibold mb-1 text-sm">
          {note.extracted_title}
        </h3>
      )}

      <p className="text-[var(--terminal-text-dim)] text-xs line-clamp-3">
        {note.content}
      </p>

      {note.extracted_context && (
        <p className="text-[var(--terminal-muted)] text-xs mt-2 italic">
          {note.extracted_context}
        </p>
      )}
    </Card>
  );
}
