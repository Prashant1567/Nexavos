'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { CheckCircle2 } from 'lucide-react';

/**
 * SyncIndicator — Global connectivity & sync status pill.
 * 
 * Displays in the top-right of every screen:
 *   - 🟢 Online      — connected, nothing pending
 *   - 🟠 Offline     — disconnected, shows pending count
 *   - 🔵 Syncing...  — active upload in progress (pulsing)
 *   - 🔴 Sync Error  — failed, tap to retry
 *
 * Also shows a success toast when records are synced.
 */
export function SyncIndicator() {
  const { syncState, pendingCount, lastSyncedCount, syncNow } = useOfflineSync();
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prevSyncedRef = useRef(0);

  // Delay visibility to avoid flash on initial render
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Show toast when sync completes with synced records
  useEffect(() => {
    if (lastSyncedCount > 0 && lastSyncedCount !== prevSyncedRef.current) {
      prevSyncedRef.current = lastSyncedCount;
      setToast(`${lastSyncedCount} record${lastSyncedCount > 1 ? 's' : ''} synced successfully`);
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncedCount]);

  if (!visible) return null;

  const config = {
    synced: {
      dotClass: 'bg-emerald-500',
      pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      label: 'Online',
      pulse: false,
    },
    syncing: {
      dotClass: 'bg-blue-500',
      pillClass: 'bg-blue-50 border-blue-200 text-blue-700',
      label: 'Syncing...',
      pulse: true,
    },
    offline: {
      dotClass: 'bg-amber-500',
      pillClass: 'bg-amber-50 border-amber-200 text-amber-700',
      label: pendingCount > 0 ? `Offline — ${pendingCount} saved` : 'Offline',
      pulse: false,
    },
    error: {
      dotClass: 'bg-red-500',
      pillClass: 'bg-red-50 border-red-200 text-red-700 cursor-pointer',
      label: 'Sync Error',
      pulse: false,
    },
  }[syncState];

  return (
    <>
      {/* Status Pill */}
      <button
        onClick={syncState === 'error' ? syncNow : undefined}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          border text-[10px] font-bold transition-all duration-300
          touch-action-manipulation select-none
          ${config.pillClass}
        `}
        aria-label={`Sync status: ${config.label}`}
      >
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.dotClass}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`} />
        </span>
        {config.label}
      </button>

      {/* Sync Success Toast */}
      {toast && (
        <div
          className="
            fixed top-14 right-3 z-[70]
            flex items-center gap-2 px-4 py-2.5 rounded-xl
            bg-emerald-600 text-white text-xs font-bold
            shadow-lg shadow-emerald-600/20
            animate-in slide-in-from-top-2 fade-in duration-300
          "
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {toast}
        </div>
      )}
    </>
  );
}
