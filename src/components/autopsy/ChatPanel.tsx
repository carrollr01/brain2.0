'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAutopsyRun } from '@/hooks/useAutopsyRun';
import { SourceChecklist } from './SourceChecklist';
import { ReportRenderer } from './ReportRenderer';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const {
    isRunning,
    statusMessage,
    sourceChecklist,
    reportContent,
    reportId,
    error: runError,
    toolCalls,
    startRun,
  } = useAutopsyRun();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusMessage, toolCalls, reportContent]);

  // Navigate when autopsy completes
  useEffect(() => {
    if (reportId) {
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Autopsy complete. Report saved.`,
        },
      ]);
    }
  }, [reportId]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending || isRunning) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      // Build API messages (only user/assistant, not system)
      const apiMessages = [...messages, userMessage]
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const response = await fetch('/api/autopsy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${data.error}` }]);
        return;
      }

      const responseText = data.response;

      // Check if Claude wants to run an autopsy
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.action === 'run_autopsy' && parsed.company) {
          setMessages(prev => [
            ...prev,
            { role: 'system', content: `Starting autopsy on ${parsed.company}...` },
          ]);
          startRun(parsed.company);
          return;
        }
      } catch {
        // Not JSON, treat as normal response
      }

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'system', content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}` },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, isRunning, messages, startRun]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isRunning && (
          <div className="text-center py-12 space-y-2">
            <p className="text-xs text-[var(--terminal-text-dim)]">
              Market Autopsy
            </p>
            <p className="text-[10px] text-[var(--terminal-muted)]">
              Ask me to analyze any company. Try &quot;autopsy Datadog&quot; or just chat about markets.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-white/10 text-[var(--terminal-text)]'
                  : msg.role === 'system'
                    ? 'text-[var(--terminal-muted)] italic'
                    : 'bg-white/5 text-[var(--terminal-text-dim)] border border-[var(--terminal-border)]'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Running state - show live updates */}
        {isRunning && (
          <div className="space-y-3">
            {/* Status message */}
            <div className="flex justify-start">
              <div className="text-xs text-[var(--terminal-warning)] animate-pulse">
                {statusMessage}
              </div>
            </div>

            {/* Tool calls log */}
            {toolCalls.length > 0 && (
              <div className="border border-[var(--terminal-border)] rounded p-2 space-y-1">
                <div className="text-[10px] text-[var(--terminal-muted)] uppercase tracking-wider mb-1">
                  Research Activity
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {toolCalls.slice(-15).map((tc, i) => (
                    <div key={i} className="text-[10px] text-[var(--terminal-text-dim)] flex gap-1.5">
                      <span className="text-[var(--cat-book)] shrink-0">
                        {tc.tool === 'web_search' ? 'SEARCH' : 'FETCH'}
                      </span>
                      <span className="truncate">{tc.input}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source checklist */}
            {sourceChecklist.length > 0 && (
              <div className="border border-[var(--terminal-border)] rounded p-2">
                <SourceChecklist sources={sourceChecklist} isLive />
              </div>
            )}

            {/* Streaming report preview */}
            {reportContent && (
              <div className="border border-[var(--terminal-border)] rounded p-3">
                <div className="text-[10px] text-[var(--terminal-muted)] uppercase tracking-wider mb-2">
                  Report Preview
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <ReportRenderer content={reportContent} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {runError && (
          <div className="text-xs text-[var(--terminal-error)] p-2 border border-[var(--terminal-error)]/30 rounded">
            Autopsy failed: {runError}
          </div>
        )}

        {/* Completed report link */}
        {reportId && (
          <div className="flex justify-start">
            <button
              onClick={() => router.push(`/autopsy/${reportId}`)}
              className="text-xs text-[var(--cat-book)] hover:underline cursor-pointer px-3 py-2 border border-[var(--terminal-border)] rounded bg-white/5"
            >
              View Full Report &rarr;
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--terminal-border)] p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Autopsy in progress...' : 'Message...'}
            disabled={isSending || isRunning}
            rows={1}
            className="flex-1 bg-[var(--terminal-bg)] border border-[var(--terminal-border)] rounded px-3 py-2 text-xs text-[var(--terminal-text)] font-mono resize-none focus:outline-none focus:border-[var(--terminal-text-dim)] disabled:opacity-50 placeholder:text-[var(--terminal-muted)]"
            style={{ minHeight: '36px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isSending || isRunning}
            className="px-3 py-2 bg-white/10 border border-[var(--terminal-border)] rounded text-xs text-[var(--terminal-text)] hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
