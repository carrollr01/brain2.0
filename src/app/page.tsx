import { Terminal } from '@/components/ui/Terminal';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--terminal-accent)]">
          $ whoami
        </h1>
        <p className="text-[var(--terminal-text-dim)] text-sm mt-1">
          Your personal second brain - capture thoughts via SMS
        </p>
      </header>

      <Terminal title="README.md">
        <div className="space-y-4 text-[var(--terminal-text-dim)]">
          <p>
            Welcome to your <span className="text-[var(--terminal-accent)]">Second Brain</span>.
          </p>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)]">## How it works</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Text your Telnyx phone number with any thought</li>
              <li>AI automatically classifies and categorizes it</li>
              <li>View, search, and edit everything here</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)]">## Quick links</p>
            <ul className="space-y-1 ml-2">
              <li>
                <Link href="/notes" className="text-[var(--terminal-accent)] hover:underline">
                  ~/notes
                </Link>
                {' '}- Movies, books, ideas, tasks, recommendations
              </li>
              <li>
                <Link href="/rolodex" className="text-[var(--terminal-accent)] hover:underline">
                  ~/rolodex
                </Link>
                {' '}- People you&apos;ve met and context about them
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)]">## Example messages</p>
            <ul className="space-y-1 ml-2 text-sm">
              <li>
                <code className="bg-[var(--terminal-bg)] px-1 rounded">Watch Dune - amazing sci-fi</code>
                {' '}→ [MOVIE]
              </li>
              <li>
                <code className="bg-[var(--terminal-bg)] px-1 rounded">Read Atomic Habits</code>
                {' '}→ [BOOK]
              </li>
              <li>
                <code className="bg-[var(--terminal-bg)] px-1 rounded">Sarah - macro class, blonde, from Chicago</code>
                {' '}→ @ROLODEX
              </li>
              <li>
                <code className="bg-[var(--terminal-bg)] px-1 rounded">Great sushi place on 5th</code>
                {' '}→ [RECOMMENDATION]
              </li>
            </ul>
          </div>
        </div>
      </Terminal>
    </div>
  );
}
