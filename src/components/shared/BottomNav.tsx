'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, ShieldCheck, FileText } from 'lucide-react';
import { t } from '@/lib/i18n';

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: Home, labelKey: 'nav_home' },
  { href: '/collect', icon: ClipboardList, labelKey: 'nav_collect' },
  { href: '/review', icon: ShieldCheck, labelKey: 'nav_review', adminOnly: true },
  { href: '/reports', icon: FileText, labelKey: 'nav_reports', adminOnly: true },
];

// Routes where the bottom nav should NOT appear
const HIDDEN_ROUTES = ['/auth', '/auth/login'];

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem('dmrv-user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setRole(parsed.role || null);
      }
    } catch {
      // ignore
    }
  }, []);

  // Don't render on auth pages or before client mount
  if (!mounted) return null;
  if (!role) return null;
  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && role !== 'admin') return false;
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border/80 safe-area-bottom"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              className={`
                flex flex-col items-center justify-center flex-1
                py-2 pt-2.5 gap-0.5
                text-[9px] font-bold tracking-wide uppercase
                transition-colors duration-200
                touch-action-manipulation select-none
                min-h-[52px]
                ${isActive
                  ? 'text-primary'
                  : 'text-zinc-400 hover:text-zinc-600 active:text-primary'
                }
              `}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 bg-primary rounded-full" />
                )}
              </div>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
