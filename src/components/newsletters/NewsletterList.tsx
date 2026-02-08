'use client';

import { useState } from 'react';
import { NewsletterCard } from './NewsletterCard';
import { NewsletterDetail } from './NewsletterDetail';
import { SourceFilter } from './SourceFilter';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { useNewsletters } from '@/hooks/useNewsletters';
import type { Newsletter } from '@/types/database';

export function NewsletterList() {
  const [search, setSearch] = useState('');
  const [sourceId, setSourceId] = useState('all');
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const { newsletters, sources, isLoading, error, refetch, deleteNewsletter, toggleRead } =
    useNewsletters({ search, sourceId });

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const response = await fetch('/api/newsletters/sync', { method: 'POST' });

      // Handle non-JSON responses (e.g., Vercel error pages)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.slice(0, 200)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync');
      }

      setSyncResult(data.message);
      if (data.errors && data.errors.length > 0) {
        setSyncError(`Partial errors: ${data.errors[0]}`);
      }
      refetch();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNewsletter(id);
    setSelectedNewsletter(null);
  };

  const handleToggleRead = async (id: string, isRead: boolean) => {
    await toggleRead(id, isRead);
    // Update the selected newsletter in-place
    setSelectedNewsletter(prev =>
      prev && prev.id === id ? { ...prev, is_read: isRead } : prev
    );
  };

  const handleCardClick = (newsletter: Newsletter) => {
    setSelectedNewsletter(newsletter);
    // Auto-mark as read when opened
    if (!newsletter.is_read) {
      toggleRead(newsletter.id, true);
    }
  };

  const unreadCount = newsletters.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <SearchBar onSearch={setSearch} placeholder="grep newsletters..." />
        </div>
        <SourceFilter sources={sources} value={sourceId} onChange={setSourceId} />
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          variant="primary"
          size="sm"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Unread count */}
      {unreadCount > 0 && (
        <div className="text-[#14b8a6] text-xs">
          {unreadCount} unread newsletter{unreadCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Status messages */}
      {syncError && (
        <div className="text-[var(--terminal-error)] text-xs p-2 border border-[var(--terminal-error)] rounded">
          {syncError}
        </div>
      )}
      {syncResult && (
        <div className="text-[#22c55e] text-xs p-2 border border-[#22c55e]/30 rounded">
          {syncResult}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          Loading<span className="cursor-blink" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-[var(--terminal-error)] text-center py-8 text-xs">
          ERROR: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && newsletters.length === 0 && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          No newsletters found. Add sources in Settings and click &quot;Sync Now&quot;.
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {newsletters.map((newsletter) => (
          <NewsletterCard
            key={newsletter.id}
            newsletter={newsletter}
            onClick={() => handleCardClick(newsletter)}
          />
        ))}
      </div>

      {/* Detail modal */}
      {selectedNewsletter && (
        <NewsletterDetail
          newsletter={selectedNewsletter}
          onClose={() => setSelectedNewsletter(null)}
          onDelete={handleDelete}
          onToggleRead={handleToggleRead}
        />
      )}
    </div>
  );
}
