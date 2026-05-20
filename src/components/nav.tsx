'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  GitBranch,
  ListFilter,
  Users,
  Megaphone,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/channels', label: 'Channels', icon: Radio },
  { href: '/journey', label: 'Journey', icon: GitBranch },
  { href: '/funnel', label: 'Funnel', icon: ListFilter },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/content', label: 'Content', icon: Megaphone },
  { href: '/attribution', label: 'Reallocation', icon: Sparkles },
  { href: '/docs', label: 'Methodology', icon: BookOpen },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Marketing Intelligence
            </span>
            <span className="font-display text-base font-medium text-foreground">Convergence</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {active && (
                  <span className="pointer-events-none absolute inset-x-2 -bottom-[13px] h-[2px] rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <span className="hidden md:inline text-[11px] text-muted-foreground tabular">
            Demo • simulated data
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* mobile nav row */}
      <nav className="flex lg:hidden items-center gap-1 overflow-x-auto border-t border-border/40 px-2 py-1.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 text-[12px]',
                active
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="hsl(var(--primary))" />
      <path
        d="M7 19V9h2.6l3.4 6.4L16.4 9H19v10h-2.2v-6.5L13.8 19h-1.6L9.2 12.5V19H7Z"
        fill="hsl(var(--accent))"
      />
    </svg>
  );
}
