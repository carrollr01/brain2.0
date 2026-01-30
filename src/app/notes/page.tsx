import { Terminal } from '@/components/ui/Terminal';
import { NoteList } from '@/components/notes/NoteList';

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          Notes
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          Captured thoughts, ideas, and recommendations
        </p>
      </header>

      <Terminal title="All Notes">
        <NoteList />
      </Terminal>
    </div>
  );
}
