interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  accentColor?: string;
}

export function Card({
  children,
  className = '',
  hover = true,
  onClick,
  accentColor,
}: CardProps) {
  const style = accentColor
    ? {
        backgroundColor: `color-mix(in srgb, ${accentColor} 5%, transparent)`,
        borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
      }
    : undefined;

  return (
    <div
      className={`
        bg-transparent
        border border-[var(--terminal-border)]
        rounded-lg p-4
        ${hover ? 'hover:border-[var(--terminal-accent)] transition-all cursor-pointer' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
