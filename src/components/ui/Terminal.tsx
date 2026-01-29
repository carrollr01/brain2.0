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
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--terminal-border)]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27ca3f]" />
          </div>
          <span className="text-[var(--terminal-muted)] text-xs ml-2">
            {title}
          </span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
