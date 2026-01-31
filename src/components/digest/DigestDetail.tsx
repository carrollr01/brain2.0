'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Digest } from '@/types/database';
import { format } from 'date-fns';

interface DigestDetailProps {
  digest: Digest;
  onClose: () => void;
  onDelete: (id: string) => void;
}

interface DigestSectionProps {
  title: string;
  content: string | null;
  icon?: string;
}

function DigestSection({ title, content, icon }: DigestSectionProps) {
  if (!content) return null;

  return (
    <div className="mb-6">
      <h3 className="text-[var(--terminal-accent)] text-xs font-semibold mb-2 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      <div className="text-[var(--terminal-text-dim)] text-xs whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}

export function DigestDetail({ digest, onClose, onDelete }: DigestDetailProps) {
  const handleDelete = () => {
    if (confirm('Delete this digest? This cannot be undone.')) {
      onDelete(digest.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--terminal-bg)] border border-[var(--terminal-border)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--terminal-border)]">
          <div>
            <h2 className="text-[var(--terminal-text)] font-semibold text-sm">
              Podcast Digest
            </h2>
            <p className="text-[var(--terminal-accent)] text-xs mt-0.5">
              {format(new Date(digest.date), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-[var(--terminal-muted)] text-xs mt-0.5">
              {digest.episode_count} episodes from {digest.podcasts_included.join(', ')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <DigestSection
            title="TOPIC OF THE DAY"
            content={digest.topic_of_day}
          />

          <DigestSection
            title="TOP DEVELOPMENTS"
            content={digest.top_developments}
          />

          <DigestSection
            title="STRONGEST OPINIONS & NARRATIVES"
            content={digest.strong_opinions}
          />

          <DigestSection
            title="UNIQUE TAKES"
            content={digest.unique_takes}
          />

          <DigestSection
            title="PEOPLE & POWER"
            content={digest.people_power}
          />

          <DigestSection
            title="CONTRARIAN RADAR"
            content={digest.contrarian_radar}
          />

          <DigestSection
            title="FORWARD-LOOKING"
            content={digest.forward_looking}
          />

          <DigestSection
            title="ACTIONABLE INTEL"
            content={digest.actionable_intel}
          />

          <DigestSection
            title="VIBE CHECK"
            content={digest.vibe_check}
          />
        </div>
      </div>
    </div>
  );
}
