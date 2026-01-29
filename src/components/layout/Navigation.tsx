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
      <nav className="w-52 bg-transparent border-r border-[var(--terminal-border)] p-3 hidden lg:flex flex-col min-h-screen">
        <div className="mb-6">
          <h1 className="text-xs font-semibold text-[var(--terminal-text)]">
            SECOND_BRAIN
          </h1>
          <p className="text-[10px] text-[var(--terminal-muted)]">v2.0.0</p>
        </div>

        <ul className="space-y-0.5 flex-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-2 py-1 rounded text-xs
                    transition-colors
                    ${
                      isActive
                        ? 'bg-white/5 text-[var(--terminal-text)]'
                        : 'text-[var(--terminal-muted)] hover:text-[var(--terminal-text-dim)] hover:bg-white/5'
                    }
                  `}
                >
                  <span className={isActive ? 'text-[var(--terminal-accent)]' : 'text-[var(--terminal-muted)]'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="text-[10px] text-[var(--terminal-muted)] pt-3 border-t border-[var(--terminal-border)]">
          <div>SMS your Telnyx number</div>
          <div className="mt-0.5">to add entries</div>
        </div>
      </nav>

      {/* Mobile top nav */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 bg-[var(--terminal-bg)] border-b border-[var(--terminal-border)] z-40">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-xs font-semibold text-[var(--terminal-text)]">
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
                        ? 'text-[var(--terminal-text)]'
                        : 'text-[var(--terminal-muted)]'
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
