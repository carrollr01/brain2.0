'use client';

import { formatDistanceToNow } from 'date-fns';
import type { AutopsyReport } from '@/types/database';

interface ReportCardProps {
  report: AutopsyReport;
  onClick: () => void;
}

const statusConfig = {
  running: { label: 'Running', color: 'var(--terminal-warning)', pulse: true },
  complete: { label: 'Complete', color: 'var(--terminal-accent-green, #22c55e)', pulse: false },
  failed: { label: 'Failed', color: 'var(--terminal-error)', pulse: false },
};

export function ReportCard({ report, onClick }: ReportCardProps) {
  const config = statusConfig[report.status];
  const sourceCount = (report.source_checklist as { sources?: unknown[] })?.sources?.length || 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded border border-[var(--terminal-border)] bg-transparent hover:bg-white/5 hover:border-[var(--terminal-text-dim)] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold text-[var(--terminal-text)] truncate">
          {report.company_name}
        </h3>
        <span
          className={`text-[10px] font-mono shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--terminal-muted)]">
        <span>
          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
        </span>
        {sourceCount > 0 && (
          <span>{sourceCount} sources</span>
        )}
      </div>

      {report.error_message && (
        <p className="text-[10px] text-[var(--terminal-error)] mt-1 truncate">
          {report.error_message}
        </p>
      )}
    </button>
  );
}
