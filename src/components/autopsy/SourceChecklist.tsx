'use client';

import type { AutopsySource } from '@/lib/autopsy/types';

interface SourceChecklistProps {
  sources: AutopsySource[];
  isLive?: boolean;
}

const categoryLabels: Record<AutopsySource['category'], string> = {
  competitor: 'Competitor Pages',
  earnings: 'Earnings Transcripts',
  reviews: 'Customer Reviews',
  reddit: 'Reddit / Forums',
};

const categoryTargets: Record<AutopsySource['category'], number> = {
  competitor: 8,
  earnings: 3,
  reviews: 12,
  reddit: 1,
};

const statusIcons: Record<AutopsySource['status'], string> = {
  searching: '...',
  fetched: '[OK]',
  failed: '[X]',
};

const statusColors: Record<AutopsySource['status'], string> = {
  searching: 'var(--terminal-warning)',
  fetched: 'var(--terminal-accent-green, #22c55e)',
  failed: 'var(--terminal-error)',
};

export function SourceChecklist({ sources, isLive }: SourceChecklistProps) {
  const grouped = sources.reduce<Record<string, AutopsySource[]>>((acc, source) => {
    if (!acc[source.category]) acc[source.category] = [];
    acc[source.category].push(source);
    return acc;
  }, {});

  const categories: AutopsySource['category'][] = ['competitor', 'earnings', 'reviews', 'reddit'];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[var(--terminal-text)] uppercase tracking-wider">
        Source Coverage {isLive && <span className="text-[var(--terminal-warning)] animate-pulse">LIVE</span>}
      </h3>

      {categories.map(cat => {
        const catSources = grouped[cat] || [];
        const fetched = catSources.filter(s => s.status === 'fetched').length;
        const target = categoryTargets[cat];

        return (
          <div key={cat} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--terminal-text-dim)]">{categoryLabels[cat]}</span>
              <span
                className="font-mono"
                style={{ color: fetched >= target ? 'var(--terminal-accent-green, #22c55e)' : 'var(--terminal-muted)' }}
              >
                {fetched}/{target}
              </span>
            </div>

            {catSources.length > 0 && (
              <div className="space-y-0.5 pl-2 border-l border-[var(--terminal-border)]">
                {catSources.map((source, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px]">
                    <span
                      className="shrink-0 font-mono"
                      style={{ color: statusColors[source.status] }}
                    >
                      {statusIcons[source.status]}
                    </span>
                    <span className="text-[var(--terminal-text-dim)] truncate" title={source.url}>
                      {source.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {catSources.length === 0 && (
              <div className="text-[10px] text-[var(--terminal-muted)] pl-2">
                No sources yet
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2 border-t border-[var(--terminal-border)] text-[10px] text-[var(--terminal-muted)]">
        Total: {sources.filter(s => s.status === 'fetched').length} fetched,{' '}
        {sources.filter(s => s.status === 'failed').length} failed
      </div>
    </div>
  );
}
