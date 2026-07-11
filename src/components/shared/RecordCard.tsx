import React from 'react';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { MapPin, Calendar, AlertTriangle } from 'lucide-react';

interface RecordCardProps {
  id: string;
  waste_type: 'municipal_solid' | 'organic' | 'plastic' | 'construction' | 'mixed';
  quantity: number;
  unit: 'kg' | 'ton';
  photo_url: string;
  collected_at: string;
  gps_latitude: number;
  gps_longitude: number;
  gps_accuracy: number;
  verification_status: 'pending_review' | 'verified' | 'rejected';
  anomaly_count?: number;
  lang?: 'en' | 'hi';
}

export function RecordCard({
  id,
  waste_type,
  quantity,
  unit,
  photo_url,
  collected_at,
  gps_latitude,
  gps_longitude,
  gps_accuracy,
  verification_status,
  anomaly_count = 0,
  lang = 'en',
}: RecordCardProps) {
  // Format collected date
  const dateStr = new Date(collected_at).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const wasteTypes = {
    organic: { en: 'Organic / Wet', hi: 'गीला कचरा', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    plastic: { en: 'Plastic / Dry', hi: 'प्लास्टिक कचरा', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    mixed: { en: 'Mixed', hi: 'मिश्रित', color: 'text-gray-700 bg-gray-50 border-gray-200' },
    construction: { en: 'Construction Debris', hi: 'निर्माण मलबा', color: 'text-amber-800 bg-amber-50 border-amber-200' },
    municipal_solid: { en: 'Municipal Solid', hi: 'शहरी कचरा', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  };

  const typeInfo = wasteTypes[waste_type] || wasteTypes.mixed;
  const typeLabel = lang === 'hi' ? typeInfo.hi : typeInfo.en;

  const getBadgeStatus = (status: string): 'pending' | 'verified' | 'flagged' => {
    if (status === 'verified') return 'verified';
    if (status === 'rejected') return 'flagged';
    return 'pending';
  };

  return (
    <Link href={`/records/${id}`} className="block">
      <div className="flex gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-colors shadow-xs active:scale-[0.99] transform">
        
        {/* Thumbnail Photo */}
        <div className="relative h-20 w-20 shrink-0 bg-muted rounded-lg overflow-hidden border border-border/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo_url}
            alt={waste_type}
            className="h-full w-full object-cover"
          />
          {anomaly_count > 0 && (
            <div className="absolute top-1 right-1 bg-danger text-white rounded-full p-1 flex items-center justify-center shadow-md animate-pulse">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex justify-between items-start gap-1">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${typeInfo.color}`}>
                {typeLabel}
              </span>
              <span className="text-sm font-bold font-mono text-text-primary">
                {quantity.toFixed(selectedUnitWeightDecimalLength(unit))} {unit}
              </span>
            </div>

            {/* GPS text proof */}
            <div className="flex items-center gap-1 text-[10px] text-text-muted">
              <MapPin className="h-3 w-3 text-text-muted shrink-0" />
              <span className="font-mono truncate">
                {gps_latitude.toFixed(5)}, {gps_longitude.toFixed(5)}
              </span>
              <span className="text-[9px] shrink-0 font-sans text-primary bg-primary-light/50 px-1.5 py-0.2 rounded border border-primary/10">
                ±{Math.round(gps_accuracy)}m
              </span>
            </div>

            {/* Time Stamp */}
            <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{dateStr}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border/40">
            <StatusBadge status={getBadgeStatus(verification_status)} lang={lang} />
            {anomaly_count > 0 && (
              <span className="text-[10px] text-danger font-semibold flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{anomaly_count} {lang === 'hi' ? 'ध्वजांकित' : 'flags'}</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </Link>
  );
}

// Helpers for weight decimals
function selectedUnitWeightDecimalLength(unit: 'kg' | 'ton'): number {
  return unit === 'ton' ? 2 : 1;
}
