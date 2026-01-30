'use client';

import { Card } from '@/components/ui/Card';
import type { Contact } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const timeAgo = formatDistanceToNow(new Date(contact.updated_at), {
    addSuffix: true,
  });

  return (
    <Card onClick={onClick} accentColor="#a29bfe">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[var(--terminal-accent)] font-semibold text-sm">
          {contact.name}
        </h3>
        <span className="text-xs text-[var(--terminal-muted)]">{timeAgo}</span>
      </div>

      {contact.description && (
        <p className="text-[var(--terminal-text-dim)] text-xs line-clamp-3 whitespace-pre-wrap">
          {contact.description}
        </p>
      )}

      {contact.tags && contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {contact.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-1.5 py-0.5 rounded bg-transparent text-[var(--terminal-muted)] border border-[var(--terminal-border)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
