'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AutopsyReport } from '@/types/database';

interface UseAutopsyReportsOptions {
  search?: string;
  limit?: number;
}

interface UseAutopsyReportsResult {
  reports: AutopsyReport[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  deleteReport: (id: string) => Promise<void>;
}

export function useAutopsyReports(options: UseAutopsyReportsOptions = {}): UseAutopsyReportsResult {
  const { search = '', limit = 50 } = options;

  const [reports, setReports] = useState<AutopsyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    let query = supabase
      .from('autopsy_reports')
      .select('id, company_name, status, error_message, source_checklist, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.ilike('company_name', `%${search}%`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(new Error(fetchError.message));
    } else {
      setReports((data as AutopsyReport[]) || []);
    }

    setIsLoading(false);
  }, [search, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const deleteReport = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('autopsy_reports').delete().eq('id', id);
    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return { reports, isLoading, error, refetch: fetchReports, deleteReport };
}
