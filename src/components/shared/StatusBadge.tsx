import React from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'verified' | 'flagged';
  lang?: 'en' | 'hi';
}

export function StatusBadge({ status, lang = 'en' }: StatusBadgeProps) {
  const config = {
    pending: {
      en: 'Pending Verification',
      hi: 'सत्यापन लंबित',
      className: 'bg-accent/15 border border-accent/30 text-accent font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full',
      icon: Clock,
    },
    verified: {
      en: 'Verified Activity',
      hi: 'सत्यापित गतिविधि',
      className: 'bg-primary-light border border-primary/20 text-primary font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full',
      icon: CheckCircle2,
    },
    flagged: {
      en: 'Flagged Anomaly',
      hi: 'ध्वजांकित विसंगति',
      className: 'bg-danger/10 border border-danger/30 text-danger font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full',
      icon: AlertTriangle,
    },
  };

  const item = config[status] || config.pending;
  const label = lang === 'hi' ? item.hi : item.en;
  const Icon = item.icon;

  return (
    <span className={item.className}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}
