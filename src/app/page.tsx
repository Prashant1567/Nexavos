'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem('dmrv-user');
    if (!stored) {
      router.push('/auth/login');
      return;
    }

    try {
      const user = JSON.parse(stored);
      if (user.role === 'admin') {
        router.push('/dashboard');
      } else if (user.role === 'field_worker') {
        router.push('/collect');
      } else {
        router.push('/auth/login');
      }
    } catch (e) {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="text-center space-y-2">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-text-muted">Loading Waste dMRV Ledger...</p>
      </div>
    </div>
  );
}
