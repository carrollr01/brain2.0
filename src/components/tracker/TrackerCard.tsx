'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Track, OpenEvent } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';

interface TrackerCardProps {
  track: Track;
  onDelete: (id: string) => void;
  onGetOpens: (id: string) => Promise<OpenEvent[]>;
}

export function TrackerCard({ track, onDelete, onGetOpens }: TrackerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [opens, setOpens] = useState<OpenEvent[]>([]);
  const [loadingOpens, setLoadingOpens] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasOpens = (track.open_count || 0) > 0;
  const timeAgo = formatDistanceToNow(new Date(track.created_at), { addSuffix: true });

  const handleExpand = async () => {
    if (!expanded && hasOpens) {
      setLoadingOpens(true);
      const data = await onGetOpens(track.id);
      setOpens(data);
      setLoadingOpens(false);
    }
    setExpanded(!expanded);
  };

  const copySnippet = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const baseUrl = window.location.origin;
    const snippet = `(()=>{const i=document.createElement('img');i.src='${baseUrl}/api/i/${track.id}';i.width=1;i.height=1;i.style.display='none';document.querySelector('[contenteditable="true"]').appendChild(i)})()`;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this tracker?')) {
      onDelete(track.id);
    }
  };

  return (
    <Card hover={false} className="!cursor-default">
      <div className="flex items-start justify-between gap-3" onClick={handleExpand} style={{ cursor: 'pointer' }}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${hasOpens ? 'bg-green-400' : 'bg-gray-500'}`}
          />
          <div className="min-w-0">
            <div className="text-[var(--terminal-text)] text-sm font-semibold truncate">
              {track.label}
            </div>
            <div className="text-[var(--terminal-muted)] text-xs flex gap-3 mt-0.5">
              {track.recipient && <span>{track.recipient}</span>}
              {track.subject && <span className="truncate">{track.subject}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[var(--terminal-muted)] text-xs">
            {track.open_count || 0} open{(track.open_count || 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-[var(--terminal-muted)] text-xs">{timeAgo}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="secondary" onClick={copySnippet}>
          {copied ? 'Copied!' : 'Copy snippet'}
        </Button>
        <Button size="sm" variant="danger" onClick={handleDelete}>
          Delete
        </Button>
        {hasOpens && (
          <Button size="sm" variant="secondary" onClick={handleExpand}>
            {expanded ? 'Collapse' : 'Details'}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 border-t border-[var(--terminal-border)] pt-3">
          {loadingOpens ? (
            <div className="text-[var(--terminal-muted)] text-xs">Loading...</div>
          ) : opens.length === 0 ? (
            <div className="text-[var(--terminal-muted)] text-xs">No opens recorded yet.</div>
          ) : (
            <div className="space-y-1.5">
              {opens.map((open) => (
                <div key={open.id} className="text-xs flex gap-4 text-[var(--terminal-text-dim)]">
                  <span className="text-[var(--terminal-muted)]">
                    {new Date(open.opened_at).toLocaleString()}
                  </span>
                  <span className="truncate">{open.ip || 'unknown IP'}</span>
                  <span className="truncate flex-1">{parseClient(open.user_agent)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function parseClient(ua: string | null): string {
  if (!ua) return 'unknown client';
  if (ua.includes('GoogleImageProxy')) return 'Gmail';
  if (ua.includes('Apple Mail')) return 'Apple Mail';
  if (ua.includes('Outlook')) return 'Outlook';
  if (ua.includes('Thunderbird')) return 'Thunderbird';
  if (ua.includes('Yahoo')) return 'Yahoo Mail';
  return ua.slice(0, 60);
}
