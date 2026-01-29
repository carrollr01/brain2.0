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
      'bg-white/10 text-[var(--terminal-text)] hover:bg-white/15 border border-white/10',
    secondary:
      'bg-transparent text-[var(--terminal-muted)] hover:text-[var(--terminal-text-dim)] hover:bg-white/5 border border-[var(--terminal-border)]',
    danger:
      'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-xs',
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
