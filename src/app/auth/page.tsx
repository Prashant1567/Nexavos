'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center space-y-2">
        <div className="h-6 w-6 border-2 border-[#1B6B3A] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}
