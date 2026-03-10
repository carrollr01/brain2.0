'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ReportChatProps {
  reportContent: string;
  companyName: string;
}

export function ReportChat({ reportContent, companyName }: ReportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await fetch('/api/autopsy/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          report_context: reportContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}` },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, reportContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[var(--terminal-border)] bg-[var(--terminal-bg)]">
      {/* Toggle / Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-[var(--terminal-text-dim)] hover:text-[var(--terminal-text)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span className="text-[var(--cat-book)]">▶</span>
          Ask questions about this {companyName} report
          {messages.length > 0 && (
            <span className="text-[var(--terminal-muted)]">({messages.length} messages)</span>
          )}
        </span>
        <span className="text-[10px] text-[var(--terminal-muted)]">
          {isExpanded ? '▼ collapse' : '▲ expand'}
        </span>
      </button>

      {/* Chat area */}
      {isExpanded && (
        <div className="flex flex-col" style={{ maxHeight: '400px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ maxHeight: '300px' }}>
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-[10px] text-[var(--terminal-muted)]">
                  Ask anything about this report — challenge findings, request deeper analysis, or explore specific points.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-[var(--terminal-text)]'
                      : 'bg-white/5 text-[var(--terminal-text-dim)] border border-[var(--terminal-border)]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="autopsy-chat-response prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="my-1 text-xs leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="text-[var(--terminal-text)] font-bold">{children}</strong>,
                          ul: ({ children }) => <ul className="my-1 ml-3 list-disc space-y-0.5">{children}</ul>,
                          ol: ({ children }) => <ol className="my-1 ml-3 list-decimal space-y-0.5">{children}</ol>,
                          li: ({ children }) => <li className="text-xs">{children}</li>,
                          code: ({ children }) => (
                            <code className="text-[var(--cat-book)] bg-white/5 px-1 rounded text-[10px]">{children}</code>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="text-xs text-[var(--terminal-muted)] animate-pulse px-3 py-2">
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-2 border-t border-[var(--terminal-border)]/50">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${companyName}...`}
                disabled={isSending}
                rows={1}
                className="flex-1 bg-[var(--terminal-bg)] border border-[var(--terminal-border)] rounded px-3 py-2 text-xs text-[var(--terminal-text)] font-mono resize-none focus:outline-none focus:border-[var(--terminal-text-dim)] disabled:opacity-50 placeholder:text-[var(--terminal-muted)]"
                style={{ minHeight: '36px', maxHeight: '80px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 80) + 'px';
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isSending}
                className="px-3 py-2 bg-white/10 border border-[var(--terminal-border)] rounded text-xs text-[var(--terminal-text)] hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isSending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
