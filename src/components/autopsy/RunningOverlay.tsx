'use client';

export function RunningOverlay({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <div className="text-xs text-[var(--terminal-warning)] animate-pulse">
        {message || 'Autopsy in progress...'}
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--terminal-warning)]"
            style={{
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      <p className="text-[10px] text-[var(--terminal-muted)] text-center max-w-xs">
        Claude is researching competitors, earnings, reviews, and forums. This typically takes 1-3 minutes.
      </p>
    </div>
  );
}
