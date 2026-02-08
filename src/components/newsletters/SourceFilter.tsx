'use client';

import type { NewsletterSource } from '@/types/database';

interface SourceFilterProps {
  sources: NewsletterSource[];
  value: string;
  onChange: (sourceId: string) => void;
}

export function SourceFilter({ sources, value, onChange }: SourceFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        bg-transparent
        border border-[var(--terminal-border)]
        rounded px-2 py-1.5
        text-[var(--terminal-text)]
        font-mono text-xs
        focus:outline-none focus:border-[var(--terminal-accent)]
        cursor-pointer
      "
    >
      <option value="all" className="bg-[var(--terminal-bg)]">All Sources</option>
      {sources.map((source) => (
        <option key={source.id} value={source.id} className="bg-[var(--terminal-bg)]">
          {source.sender_name}
        </option>
      ))}
    </select>
  );
}
