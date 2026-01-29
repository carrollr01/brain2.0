'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '~/home', icon: '>' },
  { href: '/notes', label: '~/notes', icon: '#' },
  { href: '/rolodex', label: '~/rolodex', icon: '@' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="w-56 bg-transparent border-r border-[var(--terminal-border)] p-4 hidden lg:flex flex-col min-h-screen">
        <div className="mb-8">
          <h1 className="text-sm font-bold text-[var(--terminal-accent)]">
            SECOND_BRAIN
          </h1>
          <p className="text-xs text-[var(--terminal-muted)]">v2.0.0</p>
        </div>

        <ul className="space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded text-xs
                    transition-colors
                    ${
                      isActive
                        ? 'bg-[var(--terminal-accent)] bg-opacity-10 text-[var(--terminal-accent)] border border-[var(--terminal-accent)] border-opacity-30'
                        : 'text-[var(--terminal-text-dim)] hover:text-[var(--terminal-text)] border border-transparent'
                    }
                  `}
                >
                  <span className="text-[var(--terminal-muted)]">
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && <span className="cursor-blink ml-auto" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="text-xs text-[var(--terminal-muted)] pt-4 border-t border-[var(--terminal-border)]">
          <div>SMS your Telnyx number</div>
          <div className="mt-1">to add entries</div>
        </div>
      </nav>

      {/* Mobile top nav */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--terminal-bg)] border-b border-[var(--terminal-border)] z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-sm font-bold text-[var(--terminal-accent)]">
            SECOND_BRAIN
          </h1>
          <div className="flex gap-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    text-xs
                    ${
                      isActive
                        ? 'text-[var(--terminal-accent)]'
                        : 'text-[var(--terminal-text-dim)]'
                    }
                  `}
                >
                  {item.label.replace('~/', '')}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
