'use client';

import { useSearchParams } from 'next/navigation';
import { Terminal } from '@/components/ui/Terminal';
import { GoogleCalendarConnection } from '@/components/settings/GoogleCalendarConnection';
import { Suspense } from 'react';

function SettingsContent() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold text-[var(--terminal-text)]">
          Settings
        </h1>
        <p className="text-[var(--terminal-muted)] text-xs mt-1">
          Manage your integrations and preferences
        </p>
      </header>

      {connected === 'true' && (
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg px-4 py-3">
          <p className="text-sm text-[#22c55e]">
            Google Calendar connected successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-sm text-red-400">
            {error === 'denied' && 'You denied access to Google Calendar.'}
            {error === 'invalid_state' && 'Invalid session. Please try again.'}
            {error === 'token_exchange' && 'Failed to connect. Please try again.'}
            {error === 'no_code' && 'No authorization received. Please try again.'}
            {error === 'oauth_init_failed' && 'Failed to start connection. Please try again.'}
          </p>
        </div>
      )}

      <Terminal title="Integrations">
        <div className="space-y-4">
          <GoogleCalendarConnection />
        </div>
      </Terminal>

      <Terminal title="How to use Calendar">
        <div className="space-y-3 text-xs text-[var(--terminal-text-dim)]">
          <p>
            Once connected, you can create calendar events by texting messages with a
            <span className="text-[var(--terminal-accent)]"> date and time</span>.
          </p>

          <div className="space-y-2">
            <p className="text-[var(--terminal-text)] font-semibold">Examples</p>
            <ul className="space-y-1 ml-2">
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">
                  Meeting with John tomorrow at 3pm
                </code>
              </li>
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">
                  Dentist appointment Friday 10am
                </code>
              </li>
              <li>
                <code className="text-[var(--terminal-text)] bg-[var(--terminal-border)] px-1 rounded">
                  Call with Sarah next Monday 2:30pm video call
                </code>
                <span className="text-[var(--terminal-muted)]"> (adds Google Meet)</span>
              </li>
            </ul>
          </div>

          <p className="text-[var(--terminal-muted)]">
            Messages without a specific time (like &quot;Call mom tomorrow&quot;) will be saved as tasks instead.
          </p>
        </div>
      </Terminal>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
