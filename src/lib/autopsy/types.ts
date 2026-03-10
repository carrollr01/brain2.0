export type AutopsySSEEvent =
  | { type: 'status'; message: string }
  | { type: 'tool_call'; tool: string; input: string }
  | { type: 'source_checklist'; data: { sources: AutopsySource[] } }
  | { type: 'report_chunk'; content: string }
  | { type: 'complete'; report_id: string }
  | { type: 'error'; message: string };

export interface AutopsySource {
  category: 'competitor' | 'earnings' | 'reviews' | 'reddit';
  name: string;
  url: string;
  status: 'searching' | 'fetched' | 'failed';
}
