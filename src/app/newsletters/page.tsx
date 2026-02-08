import { Terminal } from '@/components/ui/Terminal';
import { NewsletterList } from '@/components/newsletters/NewsletterList';

export default function NewslettersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          Newsletters
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          AI-summarized newsletters from your Gmail inbox
        </p>
      </header>

      <Terminal title="All Newsletters">
        <NewsletterList />
      </Terminal>
    </div>
  );
}
