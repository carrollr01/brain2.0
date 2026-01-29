interface TerminalProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Terminal({ title, children, className = '' }: TerminalProps) {
  return (
    <div
      className={`bg-[var(--terminal-surface)] border border-[var(--terminal-border)] rounded-lg overflow-hidden ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--terminal-border)] bg-[var(--terminal-bg)]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-[var(--terminal-text-dim)] text-sm ml-2">
            {title}
          </span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
