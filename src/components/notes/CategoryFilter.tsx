'use client';

import type { NoteCategory } from '@/types/database';

const categories: Array<NoteCategory | 'all'> = [
  'all',
  'movie',
  'book',
  'idea',
  'task',
  'plan',
  'recommendation',
  'quote',
  'other',
];

interface CategoryFilterProps {
  value: NoteCategory | 'all';
  onChange: (category: NoteCategory | 'all') => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as NoteCategory | 'all')}
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
      {categories.map((cat) => (
        <option key={cat} value={cat} className="bg-[var(--terminal-bg)]">
          {cat === 'all' ? '-- ALL --' : `[${cat.toUpperCase()}]`}
        </option>
      ))}
    </select>
  );
}
