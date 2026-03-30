'use client';

import { useState } from 'react';
import { TrackerCard } from './TrackerCard';
import { NewTrackerModal } from './NewTrackerModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { useTracker } from '@/hooks/useTracker';

export function TrackerList() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { tracks, isLoading, error, createTrack, deleteTrack, getOpens } = useTracker({ search });

  const handleCreate = async (data: { label: string; recipient?: string; subject?: string }): Promise<string | null> => {
    const track = await createTrack(data);
    return track?.id || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <SearchBar onSearch={setSearch} placeholder="grep trackers..." />
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Tracker</Button>
      </div>

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

      {!isLoading && tracks.length === 0 && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          No trackers yet. Create one to start tracking email opens.
        </div>
      )}

      <div className="space-y-2">
        {tracks.map((track) => (
          <TrackerCard
            key={track.id}
            track={track}
            onDelete={deleteTrack}
            onGetOpens={getOpens}
          />
        ))}
      </div>

      <NewTrackerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
