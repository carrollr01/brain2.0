'use client';

import { useState } from 'react';
import { ContactCard } from './ContactCard';
import { ContactEditModal } from './ContactEditModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { useRolodex } from '@/hooks/useRolodex';
import type { Contact } from '@/types/database';

export function ContactList() {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const { contacts, isLoading, error, deleteContact, updateContact } =
    useRolodex({ search });

  const handleSave = async (id: string, data: Partial<Contact>) => {
    await updateContact(id, data);
    setSelectedContact(null);
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    setSelectedContact(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1">
          <SearchBar
            onSearch={setSearch}
            placeholder="grep rolodex..."
          />
        </div>
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

      {!isLoading && contacts.length === 0 && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          No contacts found. Send an SMS like &quot;Sarah - macro class&quot; to add one.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onClick={() => setSelectedContact(contact)}
          />
        ))}
      </div>

      {selectedContact && (
        <ContactEditModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
