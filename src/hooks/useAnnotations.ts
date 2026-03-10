'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AutopsyAnnotation } from '@/types/database';

interface UseAnnotationsResult {
  annotations: AutopsyAnnotation[];
  isLoading: boolean;
  addAnnotation: (annotation: {
    report_id: string;
    highlighted_text: string;
    start_offset: number;
    end_offset: number;
    note?: string;
    color?: string;
  }) => Promise<AutopsyAnnotation | null>;
  updateAnnotation: (id: string, updates: Partial<AutopsyAnnotation>) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useAnnotations(reportId: string): UseAnnotationsResult {
  const [annotations, setAnnotations] = useState<AutopsyAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnnotations = useCallback(async () => {
    if (!reportId) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from('autopsy_annotations')
      .select('*')
      .eq('report_id', reportId)
      .order('start_offset', { ascending: true });

    setAnnotations((data as AutopsyAnnotation[]) || []);
    setIsLoading(false);
  }, [reportId]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const addAnnotation = async (annotation: {
    report_id: string;
    highlighted_text: string;
    start_offset: number;
    end_offset: number;
    note?: string;
    color?: string;
  }): Promise<AutopsyAnnotation | null> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('autopsy_annotations')
      .insert({
        ...annotation,
        note: annotation.note || null,
        color: annotation.color || 'yellow',
      })
      .select()
      .single();

    if (!error && data) {
      const newAnnotation = data as AutopsyAnnotation;
      setAnnotations(prev => [...prev, newAnnotation].sort((a, b) => a.start_offset - b.start_offset));
      return newAnnotation;
    }

    return null;
  };

  const updateAnnotation = async (id: string, updates: Partial<AutopsyAnnotation>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('autopsy_annotations')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setAnnotations(prev =>
        prev.map(a => (a.id === id ? { ...a, ...updates } : a))
      );
    }
  };

  const deleteAnnotation = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('autopsy_annotations')
      .delete()
      .eq('id', id);

    if (!error) {
      setAnnotations(prev => prev.filter(a => a.id !== id));
    }
  };

  return {
    annotations,
    isLoading,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refetch: fetchAnnotations,
  };
}
