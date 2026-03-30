import { Terminal } from '@/components/ui/Terminal';
import { TrackerList } from '@/components/tracker/TrackerList';

export default function TrackerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          Tracker
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          Invisible email open tracking
        </p>
      </header>

      <Terminal title="Email Trackers">
        <TrackerList />
      </Terminal>
    </div>
  );
}
