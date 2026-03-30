'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface NewTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { label: string; recipient?: string; subject?: string }) => Promise<string | null>;
}

export function NewTrackerModal({ isOpen, onClose, onCreate }: NewTrackerModalProps) {
  const [label, setLabel] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setCreating(true);

    const trackId = await onCreate({ label: label.trim(), recipient: recipient.trim() || undefined, subject: subject.trim() || undefined });

    if (trackId) {
      const baseUrl = window.location.origin;
      const snippet = `document.querySelector('[contenteditable="true"]').insertAdjacentHTML('beforeend', '<img src="${baseUrl}/api/i/${trackId}" width="1" height="1" style="display:none" alt="" />')`;
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setLabel('');
        setRecipient('');
        setSubject('');
        onClose();
      }, 1500);
    }

    setCreating(false);
  };

  const inputClass = `
    w-full bg-transparent
    border border-[var(--terminal-border)]
    rounded py-1.5 px-3
    text-[var(--terminal-text)] text-xs
    placeholder:text-[var(--terminal-muted)]
    focus:outline-none focus:border-[var(--terminal-accent)]
    font-mono
  `;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Tracker">
      <div className="space-y-3">
        <div>
          <label className="text-[var(--terminal-muted)] text-xs block mb-1">Label *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Follow-up to Acme Corp"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[var(--terminal-muted)] text-xs block mb-1">Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="e.g. john@acme.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-[var(--terminal-muted)] text-xs block mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Partnership proposal"
            className={inputClass}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={handleCreate} disabled={!label.trim() || creating}>
            {copied ? 'Copied!' : creating ? 'Creating...' : 'Create & Copy Snippet'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
