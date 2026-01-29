'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Contact } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface ContactEditModalProps {
  contact: Contact;
  onClose: () => void;
  onSave: (id: string, data: Partial<Contact>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ContactEditModal({
  contact,
  onClose,
  onSave,
  onDelete,
}: ContactEditModalProps) {
  const [name, setName] = useState(contact.name);
  const [description, setDescription] = useState(contact.description || '');
  const [tagsInput, setTagsInput] = useState(contact.tags?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    await onSave(contact.id, {
      name,
      description: description || null,
      tags,
    });
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(contact.id);
    setIsDeleting(false);
  };

  const createdAgo = formatDistanceToNow(new Date(contact.created_at), {
    addSuffix: true,
  });
  const updatedAgo = formatDistanceToNow(new Date(contact.updated_at), {
    addSuffix: true,
  });

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Contact">
      <div className="space-y-4">
        <div className="text-xs text-[var(--terminal-muted)]">
          Created {createdAgo} | Updated {updatedAgo}
        </div>

        <div>
          <label className="block text-sm text-[var(--terminal-text-dim)] mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Who is this person? Where did you meet? Identifying details..."
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
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="classmate, copenhagen, tech..."
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
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
