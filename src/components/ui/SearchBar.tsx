'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  initialValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback(
    (query: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onSearch(query);
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      debouncedSearch(newValue);
    },
    [debouncedSearch]
  );

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--terminal-muted)] text-xs">
        $&gt;
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="
          w-full bg-transparent
          border border-[var(--terminal-border)]
          rounded py-1.5 pl-8 pr-4
          text-[var(--terminal-text)] text-xs
          placeholder:text-[var(--terminal-muted)]
          focus:outline-none focus:border-[var(--terminal-accent)]
          font-mono
        "
      />
    </div>
  );
}
