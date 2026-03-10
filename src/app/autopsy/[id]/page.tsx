'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { AnnotationLayer } from '@/components/autopsy/AnnotationLayer';
import { SourceChecklist } from '@/components/autopsy/SourceChecklist';
import { RunningOverlay } from '@/components/autopsy/RunningOverlay';
import type { AutopsyReport } from '@/types/database';
import type { AutopsySource } from '@/lib/autopsy/types';

export default function AutopsyReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [report, setReport] = useState<AutopsyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('autopsy_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setReport(data as AutopsyReport);
      }
      setIsLoading(false);
    }

    fetchReport();

    // Poll for updates if report is running
    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('autopsy_reports')
        .select('status, report_content, source_checklist, updated_at')
        .eq('id', id)
        .single();

      if (data && data.status !== 'running') {
        // Refresh full report
        const { data: fullData } = await supabase
          .from('autopsy_reports')
          .select('*')
          .eq('id', id)
          .single();
        if (fullData) setReport(fullData as AutopsyReport);
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-[var(--terminal-muted)] text-center py-12 text-xs">
        Loading<span className="cursor-blink" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <Link href="/autopsy" className="text-xs text-[var(--terminal-muted)] hover:text-[var(--terminal-text-dim)]">
          &larr; Back to Autopsy
        </Link>
        <div className="text-[var(--terminal-error)] text-center py-8 text-xs">
          {error || 'Report not found'}
        </div>
      </div>
    );
  }

  const sources = (report.source_checklist as { sources?: AutopsySource[] })?.sources || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/autopsy" className="text-[10px] text-[var(--terminal-muted)] hover:text-[var(--terminal-text-dim)]">
            &larr; Back to Autopsy
          </Link>
          <h1 className="text-lg font-bold text-[var(--terminal-text)] mt-1">
            {report.company_name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--terminal-muted)]">
            <span>{format(new Date(report.created_at), 'MMM d, yyyy')}</span>
            <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
            <span
              className="font-mono"
              style={{
                color: report.status === 'complete'
                  ? 'var(--terminal-accent-green, #22c55e)'
                  : report.status === 'failed'
                    ? 'var(--terminal-error)'
                    : 'var(--terminal-warning)',
              }}
            >
              {report.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Running state */}
      {report.status === 'running' && (
        <RunningOverlay />
      )}

      {/* Failed state */}
      {report.status === 'failed' && (
        <div className="border border-[var(--terminal-error)]/30 rounded p-3">
          <p className="text-xs text-[var(--terminal-error)]">
            Autopsy failed: {report.error_message || 'Unknown error'}
          </p>
        </div>
      )}

      {/* Report content */}
      {report.status === 'complete' && report.report_content && (
        <div className="flex gap-4">
          {/* Main report */}
          <div className="flex-1 min-w-0">
            <div className="border border-[var(--terminal-border)] rounded p-4">
              <AnnotationLayer
                reportId={report.id}
                markdownContent={report.report_content}
              />
            </div>
          </div>

          {/* Source sidebar */}
          {sources.length > 0 && (
            <div className="w-56 shrink-0 hidden lg:block">
              <div className="border border-[var(--terminal-border)] rounded p-3 sticky top-4">
                <SourceChecklist sources={sources} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
