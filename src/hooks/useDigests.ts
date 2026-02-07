'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Digest, Podcast } from '@/types/database';

interface UseDigestsOptions {
  search?: string;
  limit?: number;
}

interface UseDigestsResult {
  digests: Digest[];
  allPodcasts: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  deleteDigest: (id: string) => Promise<void>;
}

export function useDigests(options: UseDigestsOptions = {}): UseDigestsResult {
  const { search = '', limit = 30 } = options;

  const [digests, setDigests] = useState<Digest[]>([]);
  const [allPodcasts, setAllPodcasts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDigests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // Fetch digests and all active podcasts in parallel
    let query = supabase
      .from('digests')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(
        `topic_of_day.ilike.%${search}%,unique_takes.ilike.%${search}%,top_developments.ilike.%${search}%,strong_opinions.ilike.%${search}%,people_power.ilike.%${search}%,actionable_intel.ilike.%${search}%`
      );
    }

    const [digestResult, podcastResult] = await Promise.all([
      query,
      supabase.from('podcasts').select('name').eq('active', true).order('name'),
    ]);

    if (digestResult.error) {
      setError(new Error(digestResult.error.message));
    } else {
      setDigests((digestResult.data as Digest[]) || []);
    }

    if (podcastResult.data) {
      setAllPodcasts(podcastResult.data.map((p: { name: string }) => p.name));
    }

    setIsLoading(false);
  }, [search, limit]);

  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  const deleteDigest = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('digests').delete().eq('id', id);
    if (!error) {
      setDigests((prev) => prev.filter((d) => d.id !== id));
    }
  };

  return { digests, allPodcasts, isLoading, error, refetch: fetchDigests, deleteDigest };
}
