'use client';

import { Card } from '@/components/ui/Card';
import type { Digest } from '@/types/database';
import { format, isToday, isYesterday } from 'date-fns';

interface DigestCardProps {
  digest: Digest;
  onClick?: () => void;
  isExpanded?: boolean;
}

const DIGEST_ACCENT = '#a94438'; // Burnt brick red accent for digests

function formatDigestDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

export function DigestCard({ digest, onClick, isExpanded = false }: DigestCardProps) {
  const displayDate = formatDigestDate(digest.date);

  return (
    <Card onClick={onClick} accentColor={DIGEST_ACCENT} hover={!isExpanded}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[var(--terminal-accent)] text-xs font-mono">
            {displayDate}
          </span>
          <div className="text-[var(--terminal-muted)] text-xs mt-0.5">
            {digest.episode_count} episodes from {digest.podcasts_included.length} podcasts
          </div>
        </div>
      </div>

      {digest.topic_of_day && (
        <div className="mb-3">
          <h3 className="text-[var(--terminal-text)] font-semibold text-sm mb-1">
            Topic of the Day
          </h3>
          <p className="text-[var(--terminal-text-dim)] text-xs line-clamp-3">
            {digest.topic_of_day}
          </p>
        </div>
      )}

      {digest.vibe_check && (
        <div className="text-[var(--terminal-muted)] text-xs italic border-t border-[var(--terminal-border)] pt-2 mt-2">
          {digest.vibe_check.slice(0, 100)}
          {digest.vibe_check.length > 100 && '...'}
        </div>
      )}
    </Card>
  );
}
