'use client';

import { useState } from 'react';
import { NoteCard } from './NoteCard';
import { NoteEditModal } from './NoteEditModal';
import { CategoryFilter } from './CategoryFilter';
import { SearchBar } from '@/components/ui/SearchBar';
import { useNotes } from '@/hooks/useNotes';
import type { Note, NoteCategory } from '@/types/database';

export function NoteList() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<NoteCategory | 'all'>('all');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const { notes, isLoading, error, deleteNote, updateNote } = useNotes({
    search,
    category,
  });

  const handleSave = async (id: string, data: Partial<Note>) => {
    await updateNote(id, data);
    setSelectedNote(null);
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    setSelectedNote(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-col sm:flex-row">
        <div className="flex-1">
          <SearchBar onSearch={setSearch} placeholder="grep notes..." />
        </div>
        <CategoryFilter value={category} onChange={setCategory} />
      </div>

      {isLoading && (
        <div className="text-[var(--terminal-text-dim)] text-center py-8">
          Loading<span className="cursor-blink" />
        </div>
      )}

      {error && (
        <div className="text-[var(--terminal-error)] text-center py-8">
          ERROR: {error.message}
        </div>
      )}

      {!isLoading && notes.length === 0 && (
        <div className="text-[var(--terminal-muted)] text-center py-8">
          No notes found. Send an SMS to add one.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => setSelectedNote(note)}
          />
        ))}
      </div>

      {selectedNote && (
        <NoteEditModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
