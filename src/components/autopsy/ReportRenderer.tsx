'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface ReportRendererProps {
  content: string;
  className?: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-[var(--terminal-text)] mt-6 mb-3 pb-2 border-b border-[var(--terminal-border)]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-[var(--cat-book)] mt-5 mb-2 pb-1 border-b border-[var(--terminal-border)]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-[var(--cat-plan)] mt-4 mb-1.5">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-xs font-semibold text-[var(--terminal-text)] mt-3 mb-1">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-xs text-[var(--terminal-text-dim)] leading-relaxed mb-2">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--cat-book)] hover:underline"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="text-xs text-[var(--terminal-text-dim)] space-y-1 mb-2 pl-4 list-disc">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="text-xs text-[var(--terminal-text-dim)] space-y-1 mb-2 pl-4 list-decimal">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--cat-plan)] pl-3 my-2 text-[var(--terminal-text-dim)] italic text-xs">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border-collapse border border-[var(--terminal-border)]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/5">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 text-[var(--terminal-text)] font-semibold border border-[var(--terminal-border)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1.5 text-[var(--terminal-text-dim)] border border-[var(--terminal-border)]">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="my-4 border-[var(--terminal-border)]" />
  ),
  strong: ({ children }) => (
    <strong className="text-[var(--terminal-text)] font-semibold">{children}</strong>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-white/5 px-1 py-0.5 rounded text-[var(--cat-recommendation)] text-[10px]">
          {children}
        </code>
      );
    }
    return (
      <code className="block bg-white/5 p-3 rounded text-xs text-[var(--terminal-text-dim)] overflow-x-auto">
        {children}
      </code>
    );
  },
};

export function ReportRenderer({ content, className = '' }: ReportRendererProps) {
  if (!content) {
    return (
      <div className="text-[var(--terminal-muted)] text-xs text-center py-8">
        No report content yet...
      </div>
    );
  }

  return (
    <div className={`autopsy-report ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
