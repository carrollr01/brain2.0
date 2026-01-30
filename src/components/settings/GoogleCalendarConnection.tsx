'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ConnectionStatus {
  connected: boolean;
  email?: string;
}

export function GoogleCalendarConnection() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch('/api/calendar/status', { method: 'DELETE' });
      setStatus({ connected: false });
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnect() {
    window.location.href = '/api/auth/google';
  }

  if (loading) {
    return (
      <Card accentColor="#4285f4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4285f4]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#4285f4]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15h-3v-9h3v9zm6 0h-3v-4.5h3V18zm0-6h-3v-3h3v3z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--terminal-text)]">Google Calendar</h3>
            <p className="text-xs text-[var(--terminal-muted)]">Loading...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card accentColor="#4285f4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#4285f4]/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#4285f4]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15h-3v-9h3v9zm6 0h-3v-4.5h3V18zm0-6h-3v-3h3v3z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--terminal-text)]">Google Calendar</h3>
            {status?.connected ? (
              <p className="text-xs text-[#22c55e]">
                Connected as {status.email}
              </p>
            ) : (
              <p className="text-xs text-[var(--terminal-muted)]">
                Not connected
              </p>
            )}
          </div>
        </div>

        {status?.connected ? (
          <Button
            onClick={handleDisconnect}
            disabled={disconnecting}
            variant="secondary"
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        ) : (
          <Button onClick={handleConnect}>
            Connect
          </Button>
        )}
      </div>

      {!status?.connected && (
        <p className="mt-3 text-xs text-[var(--terminal-text-dim)]">
          Connect your Google Calendar to create events via SMS. Text something like
          &quot;Meeting with John tomorrow at 3pm&quot; and it will appear on your calendar.
        </p>
      )}
    </Card>
  );
}
