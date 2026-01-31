import { Terminal } from '@/components/ui/Terminal';
import { DigestList } from '@/components/digest/DigestList';

export default function DigestPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          Podcast Digest
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          Daily synthesis of tech, investing, and venture podcasts
        </p>
      </header>

      <Terminal title="Digests">
        <DigestList />
      </Terminal>
    </div>
  );
}
