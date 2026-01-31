'use client';

import { useState } from 'react';
import { DigestCard } from './DigestCard';
import { DigestDetail } from './DigestDetail';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { useDigests } from '@/hooks/useDigests';
import type { Digest } from '@/types/database';

export function DigestList() {
  const [search, setSearch] = useState('');
  const [selectedDigest, setSelectedDigest] = useState<Digest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { digests, isLoading, error, deleteDigest, refetch } = useDigests({
    search,
  });

  const handleDelete = async (id: string) => {
    await deleteDigest(id);
    setSelectedDigest(null);
  };

  const handleGenerateDigest = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/digests/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate digest');
      }

      refetch();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate digest');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get today's digest if it exists
  const today = new Date().toISOString().split('T')[0];
  const todayDigest = digests.find(d => d.date === today);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <SearchBar onSearch={setSearch} placeholder="grep digests..." />
        </div>
        <Button
          onClick={handleGenerateDigest}
          disabled={isGenerating}
          variant="primary"
          size="sm"
        >
          {isGenerating ? 'Generating...' : 'Generate Now'}
        </Button>
      </div>

      {generateError && (
        <div className="text-[var(--terminal-error)] text-xs p-2 border border-[var(--terminal-error)] rounded">
          {generateError}
        </div>
      )}

      {isLoading && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          Loading<span className="cursor-blink" />
        </div>
      )}

      {error && (
        <div className="text-[var(--terminal-error)] text-center py-8 text-xs">
          ERROR: {error.message}
        </div>
      )}

      {!isLoading && digests.length === 0 && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          No digests yet. Click &quot;Generate Now&quot; to create your first digest.
        </div>
      )}

      {/* Today's digest featured */}
      {todayDigest && (
        <div className="mb-6">
          <h2 className="text-[var(--terminal-accent)] text-xs font-semibold mb-3">
            TODAY&apos;S DIGEST
          </h2>
          <DigestCard
            digest={todayDigest}
            onClick={() => setSelectedDigest(todayDigest)}
          />
        </div>
      )}

      {/* Previous digests */}
      {digests.filter(d => d.date !== today).length > 0 && (
        <div>
          <h2 className="text-[var(--terminal-muted)] text-xs font-semibold mb-3">
            PREVIOUS DIGESTS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {digests
              .filter(d => d.date !== today)
              .map((digest) => (
                <DigestCard
                  key={digest.id}
                  digest={digest}
                  onClick={() => setSelectedDigest(digest)}
                />
              ))}
          </div>
        </div>
      )}

      {selectedDigest && (
        <DigestDetail
          digest={selectedDigest}
          onClose={() => setSelectedDigest(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
