'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAnnotations } from '@/hooks/useAnnotations';
import { ReportRenderer } from './ReportRenderer';
import type { AutopsyAnnotation } from '@/types/database';

interface AnnotationLayerProps {
  reportId: string;
  markdownContent: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', bg: 'rgba(250, 204, 21, 0.25)' },
  { name: 'blue', bg: 'rgba(96, 165, 250, 0.25)' },
  { name: 'green', bg: 'rgba(74, 222, 128, 0.25)' },
  { name: 'pink', bg: 'rgba(244, 114, 182, 0.25)' },
];

interface ToolbarState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
}

interface NotePopoverState {
  visible: boolean;
  annotation: AutopsyAnnotation | null;
  x: number;
  y: number;
}

export function AnnotationLayer({ reportId, markdownContent }: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { annotations, addAnnotation, updateAnnotation, deleteAnnotation } = useAnnotations(reportId);
  const [toolbar, setToolbar] = useState<ToolbarState>({
    visible: false, x: 0, y: 0, selectedText: '', startOffset: 0, endOffset: 0,
  });
  const [notePopover, setNotePopover] = useState<NotePopoverState>({
    visible: false, annotation: null, x: 0, y: 0,
  });
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Find text offset in markdown
  const findOffsetInMarkdown = useCallback((text: string): { start: number; end: number } | null => {
    const index = markdownContent.indexOf(text);
    if (index === -1) return null;
    return { start: index, end: index + text.length };
  }, [markdownContent]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) return;

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const offsets = findOffsetInMarkdown(text);
    if (!offsets) return;

    // Position toolbar above the selection
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setToolbar({
      visible: true,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 8,
      selectedText: text,
      startOffset: offsets.start,
      endOffset: offsets.end,
    });
  }, [findOffsetInMarkdown]);

  // Close toolbar on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.annotation-toolbar') && !target.closest('.annotation-note-popover')) {
        setToolbar(prev => ({ ...prev, visible: false }));
        setNotePopover(prev => ({ ...prev, visible: false }));
        setShowNoteInput(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Add highlight
  const handleHighlight = async (color: string) => {
    await addAnnotation({
      report_id: reportId,
      highlighted_text: toolbar.selectedText,
      start_offset: toolbar.startOffset,
      end_offset: toolbar.endOffset,
      color,
    });
    setToolbar(prev => ({ ...prev, visible: false }));
    window.getSelection()?.removeAllRanges();
  };

  // Add highlight with note
  const handleAddNote = async (color: string) => {
    if (!noteInput.trim()) return;
    await addAnnotation({
      report_id: reportId,
      highlighted_text: toolbar.selectedText,
      start_offset: toolbar.startOffset,
      end_offset: toolbar.endOffset,
      note: noteInput.trim(),
      color,
    });
    setToolbar(prev => ({ ...prev, visible: false }));
    setShowNoteInput(false);
    setNoteInput('');
    window.getSelection()?.removeAllRanges();
  };

  // Handle clicking existing highlights
  const handleHighlightClick = (annotation: AutopsyAnnotation, e: React.MouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setNotePopover({
      visible: true,
      annotation,
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    });
    setNoteInput(annotation.note || '');
  };

  // Apply highlights to rendered content
  // We use a post-render approach: wrap matching text in mark elements
  useEffect(() => {
    if (!containerRef.current || annotations.length === 0) return;

    // Remove existing highlights first
    containerRef.current.querySelectorAll('mark[data-annotation-id]').forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    // Apply annotations by finding text in DOM
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
    );

    for (const annotation of annotations) {
      walker.currentNode = containerRef.current;
      let node: Node | null;
      // eslint-disable-next-line no-cond-assign
      while (node = walker.nextNode()) {
        const textNode = node as Text;
        const text = textNode.textContent || '';
        const idx = text.indexOf(annotation.highlighted_text);

        if (idx === -1) continue;

        // Split text node and wrap matching part in <mark>
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + annotation.highlighted_text.length);
        const after = text.slice(idx + annotation.highlighted_text.length);

        const mark = document.createElement('mark');
        mark.setAttribute('data-annotation-id', annotation.id);
        mark.style.backgroundColor = HIGHLIGHT_COLORS.find(c => c.name === annotation.color)?.bg || HIGHLIGHT_COLORS[0].bg;
        mark.style.cursor = 'pointer';
        mark.style.borderRadius = '2px';
        mark.textContent = match;

        const parent = textNode.parentNode;
        if (!parent) continue;

        if (before) parent.insertBefore(document.createTextNode(before), textNode);
        parent.insertBefore(mark, textNode);
        if (after) parent.insertBefore(document.createTextNode(after), textNode);
        parent.removeChild(textNode);

        // Add note indicator
        if (annotation.note) {
          const indicator = document.createElement('span');
          indicator.textContent = ' [note]';
          indicator.style.color = 'var(--terminal-muted)';
          indicator.style.fontSize = '10px';
          indicator.style.cursor = 'pointer';
          mark.appendChild(indicator);
        }

        break; // Only apply to first match
      }
    }
  }, [annotations]);

  // Attach click handlers to highlights via event delegation
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const mark = target.closest('mark[data-annotation-id]');
    if (mark) {
      const annotationId = mark.getAttribute('data-annotation-id');
      const annotation = annotations.find(a => a.id === annotationId);
      if (annotation) {
        handleHighlightClick(annotation, e);
      }
    }
  };

  return (
    <div className="relative" ref={containerRef} onMouseUp={handleMouseUp} onClick={handleContainerClick}>
      <ReportRenderer content={markdownContent} />

      {/* Selection toolbar */}
      {toolbar.visible && (
        <div
          className="annotation-toolbar absolute z-50 flex items-center gap-1 bg-[var(--terminal-surface)] border border-[var(--terminal-border)] rounded px-2 py-1.5 shadow-lg"
          style={{
            left: `${toolbar.x}px`,
            top: `${toolbar.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {!showNoteInput ? (
            <>
              {HIGHLIGHT_COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => handleHighlight(color.name)}
                  className="w-5 h-5 rounded border border-white/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color.bg }}
                  title={`Highlight ${color.name}`}
                />
              ))}
              <div className="w-px h-4 bg-[var(--terminal-border)] mx-1" />
              <button
                onClick={() => setShowNoteInput(true)}
                className="text-[10px] text-[var(--terminal-text-dim)] hover:text-[var(--terminal-text)] px-1"
              >
                + Note
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNote('yellow');
                  if (e.key === 'Escape') setShowNoteInput(false);
                }}
                placeholder="Add note..."
                className="bg-transparent border border-[var(--terminal-border)] rounded px-2 py-0.5 text-[10px] text-[var(--terminal-text)] w-48 focus:outline-none"
              />
              <button
                onClick={() => handleAddNote('yellow')}
                className="text-[10px] text-[var(--cat-book)] hover:underline px-1"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Note popover for existing annotations */}
      {notePopover.visible && notePopover.annotation && (
        <div
          className="annotation-note-popover absolute z-50 bg-[var(--terminal-surface)] border border-[var(--terminal-border)] rounded p-2 shadow-lg min-w-[200px] max-w-[300px]"
          style={{
            left: `${notePopover.x}px`,
            top: `${notePopover.y + 10}px`,
          }}
        >
          <div className="text-[10px] text-[var(--terminal-text-dim)] mb-1 truncate">
            &quot;{notePopover.annotation.highlighted_text.slice(0, 50)}...&quot;
          </div>

          {notePopover.annotation.note && (
            <div className="text-xs text-[var(--terminal-text)] mb-2 p-1 bg-white/5 rounded">
              {notePopover.annotation.note}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && notePopover.annotation) {
                  updateAnnotation(notePopover.annotation.id, { note: noteInput.trim() || null });
                  setNotePopover(prev => ({ ...prev, visible: false }));
                }
              }}
              placeholder="Edit note..."
              className="flex-1 bg-transparent border border-[var(--terminal-border)] rounded px-2 py-0.5 text-[10px] text-[var(--terminal-text)] focus:outline-none"
            />
            <button
              onClick={() => {
                if (notePopover.annotation) {
                  updateAnnotation(notePopover.annotation.id, { note: noteInput.trim() || null });
                  setNotePopover(prev => ({ ...prev, visible: false }));
                }
              }}
              className="text-[10px] text-[var(--cat-book)] hover:underline"
            >
              Save
            </button>
            <button
              onClick={() => {
                if (notePopover.annotation) {
                  deleteAnnotation(notePopover.annotation.id);
                  setNotePopover(prev => ({ ...prev, visible: false }));
                }
              }}
              className="text-[10px] text-[var(--terminal-error)] hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
