'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Track, OpenEvent } from '@/types/database';

interface UseTrackerOptions {
  search?: string;
  autoRefresh?: boolean;
}

interface UseTrackerResult {
  tracks: Track[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  createTrack: (data: { label: string; recipient?: string; subject?: string }) => Promise<Track | null>;
  deleteTrack: (id: string) => Promise<void>;
  getOpens: (trackId: string) => Promise<OpenEvent[]>;
}

export function useTracker(options: UseTrackerOptions = {}): UseTrackerResult {
  const { search = '', autoRefresh = true } = options;

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTracks = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from('tracks')
      .select('*, opens(count)')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `label.ilike.%${search}%,recipient.ilike.%${search}%,subject.ilike.%${search}%`
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(new Error(fetchError.message));
    } else {
      const mapped = (data || []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        label: t.label as string,
        recipient: t.recipient as string | null,
        subject: t.subject as string | null,
        created_at: t.created_at as string,
        open_count: Array.isArray(t.opens) && t.opens.length > 0
          ? (t.opens[0] as { count: number }).count
          : 0,
      }));
      setTracks(mapped);
    }

    setIsLoading(false);
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchTracks, 15000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchTracks]);

  const createTrack = async (data: { label: string; recipient?: string; subject?: string }): Promise<Track | null> => {
    const supabase = createClient();
    const id = crypto.randomUUID().slice(0, 8);

    const { data: created, error } = await supabase
      .from('tracks')
      .insert({
        id,
        label: data.label,
        recipient: data.recipient || null,
        subject: data.subject || null,
      })
      .select()
      .single();

    if (error) return null;

    const track = { ...(created as Track), open_count: 0 };
    setTracks((prev) => [track, ...prev]);
    return track;
  };

  const deleteTrack = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (!error) {
      setTracks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const getOpens = async (trackId: string): Promise<OpenEvent[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('opens')
      .select('*')
      .eq('track_id', trackId)
      .order('opened_at', { ascending: false });
    return (data as OpenEvent[]) || [];
  };

  return { tracks, isLoading, error, refetch: fetchTracks, createTrack, deleteTrack, getOpens };
}
