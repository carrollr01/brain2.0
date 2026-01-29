'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Note } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const timeAgo = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
  });

  return (
    <Card onClick={onClick} className="group">
      <div className="flex justify-between items-start mb-2">
        <Badge category={note.category} size="sm" />
        <span className="text-xs text-[var(--terminal-muted)]">{timeAgo}</span>
      </div>

      {note.extracted_title && (
        <h3 className="text-[var(--terminal-accent)] font-bold mb-1">
          {note.extracted_title}
        </h3>
      )}

      <p className="text-[var(--terminal-text-dim)] text-sm line-clamp-3">
        {note.content}
      </p>

      {note.extracted_context && (
        <p className="text-[var(--terminal-muted)] text-xs mt-2 italic">
          // {note.extracted_context}
        </p>
      )}
    </Card>
  );
}
