import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses =
    'font-mono rounded transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'bg-transparent border border-[var(--terminal-accent)] text-[var(--terminal-accent)] hover:bg-[var(--terminal-accent)] hover:bg-opacity-10',
    secondary:
      'bg-transparent border border-[var(--terminal-border)] text-[var(--terminal-text-dim)] hover:border-[var(--terminal-text-dim)] hover:text-[var(--terminal-text)]',
    danger:
      'bg-transparent border border-[var(--terminal-error)] text-[var(--terminal-error)] hover:bg-[var(--terminal-error)] hover:bg-opacity-10',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
