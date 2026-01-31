interface TerminalProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Terminal({ title, children, className = '' }: TerminalProps) {
  return (
    <div
      className={`bg-transparent border border-[var(--terminal-border)] rounded-lg overflow-hidden ${className}`}
    >
      {title && (
        <div className="flex items-center px-4 py-2 border-b border-[var(--terminal-border)]">
          <span className="text-[var(--terminal-muted)] text-xs">
            {title}
          </span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
