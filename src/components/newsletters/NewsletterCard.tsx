'use client';

import { Card } from '@/components/ui/Card';
import type { Newsletter } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

const NEWSLETTER_ACCENT = '#14b8a6';

interface NewsletterCardProps {
  newsletter: Newsletter;
  onClick?: () => void;
}

export function NewsletterCard({ newsletter, onClick }: NewsletterCardProps) {
  const timeAgo = formatDistanceToNow(new Date(newsletter.received_at), {
    addSuffix: true,
  });

  // Extract display name from "Name <email>" format
  const senderDisplay = newsletter.sender.replace(/<[^>]+>/, '').trim() || newsletter.sender;

  return (
    <Card onClick={onClick} accentColor={NEWSLETTER_ACCENT}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[var(--terminal-accent)] text-xs font-mono truncate max-w-[70%]">
          {senderDisplay}
        </span>
        <div className="flex items-center gap-2">
          {!newsletter.is_read && (
            <span className="w-2 h-2 rounded-full bg-[#14b8a6]" title="Unread" />
          )}
          <span className="text-xs text-[var(--terminal-muted)]">{timeAgo}</span>
        </div>
      </div>

      <h3 className={`text-sm mb-1 ${newsletter.is_read ? 'text-[var(--terminal-text-dim)]' : 'text-[var(--terminal-text)] font-semibold'}`}>
        {newsletter.subject}
      </h3>

      {newsletter.summary && (
        <p className="text-[var(--terminal-text-dim)] text-xs line-clamp-3">
          {newsletter.summary}
        </p>
      )}
    </Card>
  );
}
