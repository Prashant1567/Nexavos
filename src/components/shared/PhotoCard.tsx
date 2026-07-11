import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, ShieldCheck, Battery, WifiOff, Cpu } from 'lucide-react';

interface PhotoCardProps {
  photoUrl: string; // Base64 or remote URL
  photoHash?: string;
  capturedAt: string;
  metadata?: {
    batteryLevel?: number;
    isCharging?: boolean;
    networkStatus?: 'online' | 'offline';
    connectionType?: string;
    userAgent?: string;
    viewport?: string;
  };
}

export function PhotoCard({ photoUrl, photoHash, capturedAt, metadata }: PhotoCardProps) {
  // Extract simple device info
  const batteryPct = metadata?.batteryLevel ? `${Math.round(metadata.batteryLevel * 100)}%` : 'N/A';
  const network = metadata?.networkStatus || 'unknown';
  const isOffline = network === 'offline';

  // Format captured date
  const dateStr = new Date(capturedAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      <div className="relative aspect-video w-full bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Waste collection proof"
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] font-medium text-white flex items-center gap-1 backdrop-blur-xs">
          <Camera className="h-3 w-3" />
          <span>{dateStr}</span>
        </div>
      </div>
      <CardContent className="p-3 text-xs space-y-2">
        {/* Hash Block */}
        {photoHash && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] text-text-muted font-semibold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Cryptographic Proof Hash</span>
            </div>
            <div className="bg-muted px-2 py-1.5 rounded font-mono text-[10px] break-all border border-border/50 text-foreground selection:bg-primary-light">
              {photoHash}
            </div>
          </div>
        )}

        {/* Metadata Details */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-surface border border-border/40 p-1.5 rounded">
            <Battery className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-text-muted leading-none">Battery</p>
              <p className="font-semibold text-[10px] truncate leading-tight mt-0.5">{batteryPct}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-surface border border-border/40 p-1.5 rounded">
            <WifiOff className={`h-3.5 w-3.5 shrink-0 ${isOffline ? 'text-accent' : 'text-primary'}`} />
            <div className="min-w-0">
              <p className="text-[9px] text-text-muted leading-none">Sync Mode</p>
              <p className="font-semibold text-[10px] truncate leading-tight mt-0.5 uppercase">
                {isOffline ? 'Offline' : 'Direct'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-surface border border-border/40 p-1.5 rounded">
            <Cpu className="h-3.5 w-3.5 text-text-muted shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] text-text-muted leading-none">Viewport</p>
              <p className="font-semibold text-[10px] truncate leading-tight mt-0.5 font-mono">
                {metadata?.viewport || '390x844'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
