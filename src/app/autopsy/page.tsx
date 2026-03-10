'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/autopsy/ChatPanel';
import { ReportLibrary } from '@/components/autopsy/ReportLibrary';

export default function AutopsyPage() {
  const [view, setView] = useState<'chat' | 'library'>('chat');

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 2rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <div>
          <h1 className="text-base font-semibold text-[var(--terminal-text)]">
            Market Autopsy
          </h1>
          <p className="text-[var(--terminal-muted)] text-[10px] mt-0.5">
            AI-powered company research
          </p>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-white/5 rounded p-0.5">
          <button
            onClick={() => setView('chat')}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              view === 'chat'
                ? 'bg-white/10 text-[var(--terminal-text)]'
                : 'text-[var(--terminal-muted)] hover:text-[var(--terminal-text-dim)]'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setView('library')}
            className={`px-2 py-1 rounded text-[10px] transition-colors ${
              view === 'library'
                ? 'bg-white/10 text-[var(--terminal-text)]'
                : 'text-[var(--terminal-muted)] hover:text-[var(--terminal-text-dim)]'
            }`}
          >
            Library
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'chat' ? (
        <div className="flex-1 border border-[var(--terminal-border)] rounded overflow-hidden flex flex-col min-h-0">
          <ChatPanel />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ReportLibrary />
        </div>
      )}
    </div>
  );
}
