import { Terminal } from '@/components/ui/Terminal';
import { NoteList } from '@/components/notes/NoteList';

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--terminal-accent)]">
          $ cat ~/notes/*
        </h1>
        <p className="text-[var(--terminal-text-dim)] text-sm mt-1">
          Captured thoughts, ideas, and recommendations
        </p>
      </header>

      <Terminal title="notes.db">
        <NoteList />
      </Terminal>
    </div>
  );
}
