interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  hover = true,
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        bg-[var(--terminal-surface)]
        border border-[var(--terminal-border)]
        rounded-lg p-4
        ${hover ? 'hover:border-[var(--terminal-text-dim)] hover:terminal-glow transition-all cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
