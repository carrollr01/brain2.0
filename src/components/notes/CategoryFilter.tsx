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
        bg-[var(--terminal-bg)]
        border border-[var(--terminal-border)]
        rounded-lg px-3 py-2
        text-[var(--terminal-text)]
        font-mono text-sm
        focus:outline-none focus:border-[var(--terminal-text-dim)]
        cursor-pointer
      "
    >
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat === 'all' ? '-- ALL --' : `[${cat.toUpperCase()}]`}
        </option>
      ))}
    </select>
  );
}
