'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Note, NoteCategory } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

const categories: NoteCategory[] = [
  'movie',
  'book',
  'idea',
  'task',
  'plan',
  'recommendation',
  'quote',
  'other',
];

interface NoteEditModalProps {
  note: Note;
  onClose: () => void;
  onSave: (id: string, data: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NoteEditModal({
  note,
  onClose,
  onSave,
  onDelete,
}: NoteEditModalProps) {
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState<NoteCategory>(note.category);
  const [title, setTitle] = useState(note.extracted_title || '');
  const [context, setContext] = useState(note.extracted_context || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(note.id, {
      content,
      category,
      extracted_title: title || null,
      extracted_context: context || null,
    });
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(note.id);
    setIsDeleting(false);
  };

  const timeAgo = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
  });

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Note">
      <div className="space-y-4">
        <div className="text-xs text-[var(--terminal-muted)]">
          Created {timeAgo}
        </div>

        <div>
          <label className="block text-sm text-[var(--terminal-text-dim)] mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as NoteCategory)}
            className="
              w-full bg-[var(--terminal-bg)]
              border border-[var(--terminal-border)]
              rounded px-3 py-2
              text-[var(--terminal-text)]
              font-mono text-sm
              focus:outline-none focus:border-[var(--terminal-text-dim)]
            "
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                [{cat.toUpperCase()}]
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[var(--terminal-text-dim)] mb-1">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Extracted title..."
            className="
              w-full bg-[var(--terminal-bg)]
              border border-[var(--terminal-border)]
              rounded px-3 py-2
              text-[var(--terminal-text)]
              font-mono text-sm
              focus:outline-none focus:border-[var(--terminal-text-dim)]
            "
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--terminal-text-dim)] mb-1">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="
              w-full bg-[var(--terminal-bg)]
              border border-[var(--terminal-border)]
              rounded px-3 py-2
              text-[var(--terminal-text)]
              font-mono text-sm
              focus:outline-none focus:border-[var(--terminal-text-dim)]
              resize-none
            "
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--terminal-text-dim)] mb-1">
            Context (optional)
          </label>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Additional context..."
            className="
              w-full bg-[var(--terminal-bg)]
              border border-[var(--terminal-border)]
              rounded px-3 py-2
              text-[var(--terminal-text)]
              font-mono text-sm
              focus:outline-none focus:border-[var(--terminal-text-dim)]
            "
          />
        </div>

        <div className="flex justify-between pt-4 border-t border-[var(--terminal-border)]">
          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
