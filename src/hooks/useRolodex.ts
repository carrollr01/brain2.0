'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Contact } from '@/types/database';

interface UseRolodexOptions {
  search?: string;
  limit?: number;
}

interface UseRolodexResult {
  contacts: Contact[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  deleteContact: (id: string) => Promise<void>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
}

export function useRolodex(options: UseRolodexOptions = {}): UseRolodexResult {
  const { search = '', limit = 50 } = options;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    let query = supabase
      .from('rolodex')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(new Error(fetchError.message));
    } else {
      setContacts((data as Contact[]) || []);
    }

    setIsLoading(false);
  }, [search, limit]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const deleteContact = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('rolodex').delete().eq('id', id);
    if (!error) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const updateContact = async (id: string, data: Partial<Contact>) => {
    const supabase = createClient();
    const updateData: Record<string, unknown> = { ...data };
    if (data.name) {
      updateData.name_normalized = data.name.toLowerCase().trim();
    }
    const { data: updated, error } = await supabase
      .from('rolodex')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (!error && updated) {
      setContacts((prev) => prev.map((c) => (c.id === id ? (updated as Contact) : c)));
    }
  };

  return { contacts, isLoading, error, refetch: fetchContacts, deleteContact, updateContact };
}
