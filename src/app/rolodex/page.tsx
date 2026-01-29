import { Terminal } from '@/components/ui/Terminal';
import { ContactList } from '@/components/rolodex/ContactList';

export default function RolodexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          <span className="text-[var(--terminal-accent)]">$</span> ls ~/rolodex/
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          People you&apos;ve met and context about them
        </p>
      </header>

      <Terminal title="rolodex.db">
        <ContactList />
      </Terminal>
    </div>
  );
}
