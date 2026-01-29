import type { NoteCategory } from '@/types/database';

const categoryColors: Record<NoteCategory, string> = {
  movie: 'var(--cat-movie)',
  book: 'var(--cat-book)',
  idea: 'var(--cat-idea)',
  task: 'var(--cat-task)',
  plan: 'var(--cat-plan)',
  recommendation: 'var(--cat-recommendation)',
  quote: 'var(--cat-quote)',
  other: 'var(--cat-other)',
};

interface BadgeProps {
  category: NoteCategory;
  size?: 'sm' | 'md';
}

export function Badge({ category, size = 'md' }: BadgeProps) {
  const color = categoryColors[category];
  const sizeClasses =
    size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded font-mono uppercase ${sizeClasses}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
        color: color,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      [{category}]
    </span>
  );
}
