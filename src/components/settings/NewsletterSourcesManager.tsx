'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { NewsletterSource } from '@/types/database';

export function NewsletterSourcesManager() {
  const [sources, setSources] = useState<NewsletterSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  async function fetchSources() {
    try {
      const res = await fetch('/api/newsletters/sources');
      const data = await res.json();
      setSources(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load sources');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newEmail || !newName) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch('/api/newsletters/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: newEmail, sender_name: newName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add');
      }

      setNewEmail('');
      setNewName('');
      fetchSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/newsletters/sources/${id}`, { method: 'DELETE' });
      setSources(prev => prev.filter(s => s.id !== id));
    } catch {
      setError('Failed to delete source');
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await fetch(`/api/newsletters/sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      setSources(prev => prev.map(s => s.id === id ? { ...s, active } : s));
    } catch {
      setError('Failed to update source');
    }
  }

  return (
    <Card accentColor="#14b8a6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#14b8a6]/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-[#14b8a6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--terminal-text)]">
            Newsletter Sources
          </h3>
          <p className="text-xs text-[var(--terminal-muted)]">
            {sources.length} source{sources.length !== 1 ? 's' : ''} configured
          </p>
        </div>
      </div>

      {error && (
        <div className="text-[var(--terminal-error)] text-xs mb-3">{error}</div>
      )}

      {/* Add new source form */}
      <div className="flex gap-2 mb-4 flex-col sm:flex-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name (e.g. Stratechery)"
          className="flex-1 bg-transparent border border-[var(--terminal-border)] rounded px-2 py-1.5 text-[var(--terminal-text)] text-xs font-mono focus:outline-none focus:border-[var(--terminal-accent)]"
        />
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@newsletter.com"
          className="flex-1 bg-transparent border border-[var(--terminal-border)] rounded px-2 py-1.5 text-[var(--terminal-text)] text-xs font-mono focus:outline-none focus:border-[var(--terminal-accent)]"
        />
        <Button onClick={handleAdd} disabled={adding || !newEmail || !newName} size="sm">
          {adding ? 'Adding...' : 'Add'}
        </Button>
      </div>

      {/* Source list */}
      {loading ? (
        <div className="text-[var(--terminal-muted)] text-xs">Loading...</div>
      ) : sources.length === 0 ? (
        <div className="text-[var(--terminal-muted)] text-xs">
          No sources configured. Add a newsletter sender email above.
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between py-1.5 px-2 border border-[var(--terminal-border)] rounded text-xs"
            >
              <div className="flex-1 min-w-0">
                <span className={`text-[var(--terminal-text)] ${!source.active ? 'opacity-40' : ''}`}>
                  {source.sender_name}
                </span>
                <span className="text-[var(--terminal-muted)] ml-2 truncate">
                  {source.sender_email}
                </span>
              </div>
              <div className="flex gap-1.5 ml-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggle(source.id, !source.active)}
                >
                  {source.active ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(source.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--terminal-text-dim)]">
        Add sender emails for newsletters you want to pull from Gmail. Then go to the Newsletters page and click &quot;Sync Now&quot;.
      </p>
    </Card>
  );
}
