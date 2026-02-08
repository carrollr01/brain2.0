'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Newsletter, NewsletterSource } from '@/types/database';

interface UseNewslettersOptions {
  search?: string;
  sourceId?: string | 'all';
  isRead?: boolean | null;
  limit?: number;
}

interface UseNewslettersResult {
  newsletters: Newsletter[];
  sources: NewsletterSource[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  deleteNewsletter: (id: string) => Promise<void>;
  toggleRead: (id: string, isRead: boolean) => Promise<void>;
}

export function useNewsletters(options: UseNewslettersOptions = {}): UseNewslettersResult {
  const { search = '', sourceId = 'all', isRead = null, limit = 50 } = options;

  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [sources, setSources] = useState<NewsletterSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNewsletters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // Build newsletter query
    let query = supabase
      .from('newsletters')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (sourceId !== 'all') {
      query = query.eq('source_id', sourceId);
    }

    if (isRead !== null) {
      query = query.eq('is_read', isRead);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,sender.ilike.%${search}%,summary.ilike.%${search}%,content_text.ilike.%${search}%`
      );
    }

    // Fetch newsletters and sources in parallel
    const [newsletterResult, sourceResult] = await Promise.all([
      query,
      supabase.from('newsletter_sources').select('*').order('sender_name'),
    ]);

    if (newsletterResult.error) {
      setError(new Error(newsletterResult.error.message));
    } else {
      setNewsletters((newsletterResult.data as Newsletter[]) || []);
    }

    if (sourceResult.data) {
      setSources(sourceResult.data as NewsletterSource[]);
    }

    setIsLoading(false);
  }, [search, sourceId, isRead, limit]);

  useEffect(() => {
    fetchNewsletters();
  }, [fetchNewsletters]);

  const deleteNewsletter = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('newsletters').delete().eq('id', id);
    if (!error) {
      setNewsletters((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const toggleRead = async (id: string, readState: boolean) => {
    const supabase = createClient();
    const { data: updated, error } = await supabase
      .from('newsletters')
      .update({ is_read: readState })
      .eq('id', id)
      .select()
      .single();

    if (!error && updated) {
      setNewsletters((prev) =>
        prev.map((n) => (n.id === id ? (updated as Newsletter) : n))
      );
    }
  };

  return {
    newsletters,
    sources,
    isLoading,
    error,
    refetch: fetchNewsletters,
    deleteNewsletter,
    toggleRead,
  };
}
