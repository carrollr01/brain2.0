'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Note, NoteCategory } from '@/types/database';

interface UseNotesOptions {
  search?: string;
  category?: NoteCategory | 'all';
  limit?: number;
}

interface UseNotesResult {
  notes: Note[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  deleteNote: (id: string) => Promise<void>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
}

export function useNotes(options: UseNotesOptions = {}): UseNotesResult {
  const { search = '', category = 'all', limit = 50 } = options;

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    let query = supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(
        `content.ilike.%${search}%,extracted_title.ilike.%${search}%,extracted_context.ilike.%${search}%`
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(new Error(fetchError.message));
    } else {
      setNotes((data as Note[]) || []);
    }

    setIsLoading(false);
  }, [search, category, limit]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const deleteNote = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const updateNote = async (id: string, data: Partial<Note>) => {
    const supabase = createClient();
    const { data: updated, error } = await supabase
      .from('notes')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (!error && updated) {
      setNotes((prev) => prev.map((n) => (n.id === id ? (updated as Note) : n)));
    }
  };

  return { notes, isLoading, error, refetch: fetchNotes, deleteNote, updateNote };
}
