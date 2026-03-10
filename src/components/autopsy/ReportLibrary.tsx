'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAutopsyReports } from '@/hooks/useAutopsyReports';
import { ReportCard } from './ReportCard';
import { SearchBar } from '@/components/ui/SearchBar';

export function ReportLibrary() {
  const [search, setSearch] = useState('');
  const { reports, isLoading, error } = useAutopsyReports({ search });
  const router = useRouter();

  return (
    <div className="space-y-3">
      <SearchBar
        onSearch={setSearch}
        placeholder="Search reports..."
      />

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

      {!isLoading && reports.length === 0 && (
        <div className="text-[var(--terminal-muted)] text-center py-8 text-xs">
          No reports yet. Start a conversation to run your first autopsy.
        </div>
      )}

      {!isLoading && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => router.push(`/autopsy/${report.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
