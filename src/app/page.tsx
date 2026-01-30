import { Terminal } from '@/components/ui/Terminal';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          Welcome
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          Your personal second brain - capture thoughts via SMS
        </p>
      </header>

      <Terminal title="Getting Started">
        <div className="space-y-4 text-[var(--terminal-text-dim)] text-xs">
          <p>
            Welcome to your <span className="text-[var(--terminal-accent)]">Second Brain</span>.
          </p>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)] font-semibold">How it works</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Text your Telnyx phone number with any thought</li>
              <li>AI automatically classifies and categorizes it</li>
              <li>View, search, and edit everything here</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)] font-semibold">Quick links</p>
            <ul className="space-y-1 ml-2">
              <li>
                <Link href="/notes" className="text-[var(--terminal-accent)] hover:underline">
                  Notes
                </Link>
                {' '}- Movies, books, ideas, tasks, recommendations
              </li>
              <li>
                <Link href="/rolodex" className="text-[var(--terminal-accent)] hover:underline">
                  Rolodex
                </Link>
                {' '}- People you&apos;ve met and context about them
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)] font-semibold">Example messages</p>
            <ul className="space-y-1 ml-2">
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">Watch Dune - amazing sci-fi</code>
                <span className="text-[var(--cat-movie)]"> → Movie</span>
              </li>
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">Read Atomic Habits</code>
                <span className="text-[var(--cat-book)]"> → Book</span>
              </li>
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">Sarah - macro class, blonde</code>
                <span className="text-[#a29bfe]"> → Rolodex</span>
              </li>
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">Great sushi place on 5th</code>
                <span className="text-[var(--cat-recommendation)]"> → Recommendation</span>
              </li>
            </ul>
          </div>
        </div>
      </Terminal>
    </div>
  );
}
