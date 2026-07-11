'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/shared/BottomNav';
import { SyncIndicator } from '@/components/shared/SyncIndicator';

// Routes where the sync indicator should NOT appear
const NO_INDICATOR_ROUTES = ['/auth', '/auth/login'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasUser(!!localStorage.getItem('dmrv-user'));
  }, []);

  const showIndicator = mounted && hasUser && !NO_INDICATOR_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <>
      {/* Global Sync Indicator — floating top-center to avoid overlapping header controls */}
      {showIndicator && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]">
          <SyncIndicator />
        </div>
      )}

      {/* Page content with bottom padding for nav bar */}
      <div className="pb-[calc(52px+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </>
  );
}
