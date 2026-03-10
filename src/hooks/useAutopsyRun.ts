'use client';

import { useState, useCallback } from 'react';
import type { AutopsySSEEvent, AutopsySource } from '@/lib/autopsy/types';

interface UseAutopsyRunResult {
  isRunning: boolean;
  statusMessage: string;
  sourceChecklist: AutopsySource[];
  reportContent: string;
  reportId: string | null;
  error: string | null;
  toolCalls: Array<{ tool: string; input: string }>;
  startRun: (companyName: string, context?: string) => Promise<void>;
}

export function useAutopsyRun(): UseAutopsyRunResult {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [sourceChecklist, setSourceChecklist] = useState<AutopsySource[]>([]);
  const [reportContent, setReportContent] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<Array<{ tool: string; input: string }>>([]);

  const startRun = useCallback(async (companyName: string, context?: string) => {
    // Reset state
    setIsRunning(true);
    setStatusMessage(`Starting autopsy on ${companyName}...`);
    setSourceChecklist([]);
    setReportContent('');
    setReportId(null);
    setError(null);
    setToolCalls([]);

    try {
      const response = await fetch('/api/autopsy/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, context }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const event: AutopsySSEEvent = JSON.parse(trimmed.slice(6));

            switch (event.type) {
              case 'status':
                setStatusMessage(event.message);
                break;
              case 'tool_call':
                setToolCalls(prev => [...prev, { tool: event.tool, input: event.input }]);
                break;
              case 'source_checklist':
                setSourceChecklist(event.data.sources);
                break;
              case 'report_chunk':
                setReportContent(prev => prev + event.content);
                break;
              case 'complete':
                setReportId(event.report_id);
                setStatusMessage('Autopsy complete');
                setIsRunning(false);
                break;
              case 'error':
                setError(event.message);
                setStatusMessage('Autopsy failed');
                setIsRunning(false);
                break;
            }
          } catch {
            // Skip malformed events
          }
        }
      }

      // If we exited the loop without a complete/error event
      setIsRunning(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatusMessage('Autopsy failed');
      setIsRunning(false);
    }
  }, []);

  return {
    isRunning,
    statusMessage,
    sourceChecklist,
    reportContent,
    reportId,
    error,
    toolCalls,
    startRun,
  };
}
