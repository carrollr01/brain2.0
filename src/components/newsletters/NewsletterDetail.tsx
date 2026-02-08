'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Newsletter } from '@/types/database';
import { format } from 'date-fns';

interface NewsletterDetailProps {
  newsletter: Newsletter;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
}

function renderMarkdownContent(text: string) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

  return paragraphs.map((paragraph, i) => {
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return (
          <span key={j} className="text-[var(--terminal-text)] font-semibold">
            {boldMatch[1]}
          </span>
        );
      }
      return <span key={j}>{part}</span>;
    });

    return (
      <p key={i} className="mb-3 last:mb-0">
        {rendered}
      </p>
    );
  });
}

export function NewsletterDetail({
  newsletter,
  onClose,
  onDelete,
  onToggleRead,
}: NewsletterDetailProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(newsletter.id);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--terminal-bg)] border border-[var(--terminal-border)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--terminal-border)]">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-[var(--terminal-text)] font-semibold text-sm">
              {newsletter.subject}
            </h2>
            <p className="text-[var(--terminal-accent)] text-xs mt-0.5">
              {newsletter.sender}
            </p>
            <p className="text-[var(--terminal-muted)] text-xs mt-0.5">
              {format(new Date(newsletter.received_at), 'EEEE, MMMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onToggleRead(newsletter.id, !newsletter.is_read)}
            >
              {newsletter.is_read ? 'Mark Unread' : 'Mark Read'}
            </Button>
            {confirmDelete ? (
              <div className="flex gap-1">
                <Button variant="danger" size="sm" onClick={handleDelete}>
                  Confirm
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Summary section */}
          {newsletter.summary && (
            <div className="mb-4">
              <h3 className="text-[var(--terminal-accent)] text-xs font-semibold mb-2 uppercase tracking-wide">
                AI Summary
              </h3>
              <div className="text-[var(--terminal-text-dim)] text-xs leading-relaxed">
                {renderMarkdownContent(newsletter.summary)}
              </div>
            </div>
          )}

          {/* Toggle for full content */}
          {(newsletter.content_text || newsletter.content_html) && (
            <div className="border-t border-[var(--terminal-border)] pt-3">
              <button
                onClick={() => setShowFullContent(!showFullContent)}
                className="text-[var(--terminal-accent)] text-xs hover:underline mb-3 block"
              >
                {showFullContent ? '[-] Hide full content' : '[+] Show full content'}
              </button>

              {showFullContent && (
                <div className="text-[var(--terminal-text-dim)] text-xs leading-relaxed">
                  {newsletter.content_html ? (
                    <div
                      className="newsletter-content"
                      dangerouslySetInnerHTML={{ __html: newsletter.content_html }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono">
                      {newsletter.content_text}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
