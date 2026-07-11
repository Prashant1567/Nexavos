'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  ShieldCheck,
  ArrowLeft,
  MapPin,
  Calendar,
  HardHat,
  AlertTriangle,
  LogOut,
  XCircle,
  Eye,
  RefreshCw,
  Clock,
  Compass,
  CheckCircle2,
  HelpCircle,
  FolderOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ReviewQueuePage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Animation States for Swipe Transition
  const [exitingCardId, setExitingCardId] = useState<string | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  // Lightbox State
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Rejection Dialog State
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Clarification Input State
  const [openClarificationId, setOpenClarificationId] = useState<string | null>(null);
  const [clarificationText, setClarificationText] = useState('');

  const getIsMockMode = (): boolean => {
    if (typeof window === 'undefined') return true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !url || url.includes('placeholder-project');
  };

  const fetchData = useCallback(async () => {
    try {
      const isMock = getIsMockMode();
      if (isMock) {
        // --- MOCK MODE ---
        const storedProj = localStorage.getItem('dmrv-projects');
        const localProjects = storedProj ? JSON.parse(storedProj) : [];

        const storedColl = localStorage.getItem('dmrv-collections');
        const localCollections = storedColl ? JSON.parse(storedColl) : [];

        const mapped = localCollections.map((rc: any) => {
          const matchedProj = localProjects.find((p: any) => p.id === rc.project_id);
          return {
            ...rc,
            worker_name: rc.worker_name || 'Field Worker',
            project_name: matchedProj?.project_name || 'Unknown Project',
            site_name: matchedProj?.site_name || 'Unknown Site',
            collected_at: rc.collected_at || rc.captured_at || new Date().toISOString(),
          };
        });
        setCollections(mapped);
      } else {
        // --- SUPABASE MODE ---
        const { data: dbRecords, error: recErr } = await supabase
          .from('collection_records')
          .select(`
            *,
            projects (
              project_name,
              site_name
            ),
            users (
              name
            ),
            anomalies (
              id,
              anomaly_type,
              severity,
              status
            )
          `)
          .order('collected_at', { ascending: false });

        if (recErr) throw new Error(recErr.message);

        const formatted = (dbRecords || []).map((rc: any) => ({
          id: rc.id,
          project_id: rc.project_id,
          worker_id: rc.worker_id,
          waste_type: rc.waste_type,
          quantity: Number(rc.quantity),
          unit: rc.unit,
          notes: rc.notes,
          gps_latitude: rc.gps_latitude ? Number(rc.gps_latitude) : undefined,
          gps_longitude: rc.gps_longitude ? Number(rc.gps_longitude) : undefined,
          collected_at: rc.collected_at,
          submitted_at: rc.created_at,
          verification_status: rc.verification_status,
          risk_score: rc.risk_score,
          sync_status: rc.sync_status,
          worker_name: rc.users?.name || 'Field Worker',
          project_name: rc.projects?.project_name || 'Unknown Project',
          site_name: rc.projects?.site_name || 'Unknown Site',
          anomalies: rc.anomalies || [],
        }));
        setCollections(formatted);
      }
    } catch (err: any) {
      console.error('Error loading review queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('dmrv-user');
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'admin') {
      router.push('/collect');
      return;
    }
    if (parsed.full_name === 'Anjali Sharma (Admin)' || parsed.full_name === 'Anjali Sharma') {
      parsed.full_name = 'Prashant';
      localStorage.setItem('dmrv-user', JSON.stringify(parsed));
    }
    setAdmin(parsed);
    fetchData();
  }, [router, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('dmrv-user');
    router.push('/auth/login');
  };

  // Helper to format "time ago"
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      if (diffMs < 0) return 'Just now';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  // Helper to format exact datetime
  const formatExactDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to extract all photos for horizontal strip
  const getPhotos = (record: any): string[] => {
    if (Array.isArray(record.evidence_urls) && record.evidence_urls.length > 0) {
      return record.evidence_urls;
    }
    if (Array.isArray(record.evidence) && record.evidence.length > 0) {
      return record.evidence;
    }
    const single = record.photo_url || record.image_url;
    return single ? [single] : [];
  };

  // Action: Approve
  const handleApprove = async (id: string) => {
    setExitingCardId(id);
    setExitDirection('right');

    setTimeout(async () => {
      try {
        const isMock = getIsMockMode();
        if (isMock) {
          const stored = localStorage.getItem('dmrv-collections');
          if (stored) {
            const all = JSON.parse(stored);
            const updated = all.map((c: any) =>
              c.id === id ? { ...c, verification_status: 'verified', risk_score: 'normal' } : c
            );
            localStorage.setItem('dmrv-collections', JSON.stringify(updated));
            setCollections(updated);
          }

          // Local audit log
          const storedLogs = localStorage.getItem('dmrv-audit-logs') || '[]';
          const logs = JSON.parse(storedLogs);
          logs.push({
            id: 'log-' + Date.now(),
            actor_id: admin?.id || 'admin-uuid-9999',
            action: 'approved',
            target_table: 'collection_records',
            target_id: id,
            created_at: new Date().toISOString(),
          });
          localStorage.setItem('dmrv-audit-logs', JSON.stringify(logs));
        } else {
          // Supabase mode
          const { error: updateErr } = await supabase
            .from('collection_records')
            .update({ verification_status: 'verified', risk_score: 'normal' })
            .eq('id', id);

          if (updateErr) throw new Error(updateErr.message);

          const { error: logErr } = await supabase
            .from('audit_logs')
            .insert({
              actor_id: admin?.id,
              action: 'approved',
              target_table: 'collection_records',
              target_id: id,
            });

          if (logErr) console.error('Failed to write audit log:', logErr);
          await fetchData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setExitingCardId(null);
        setExitDirection(null);
      }
    }, 500);
  };

  // Action: Reject Trigger
  const handleRejectClick = (id: string) => {
    setSelectedRecordId(id);
    setRejectionReason('');
    setIsRejectOpen(true);
  };

  // Action: Reject Submit
  const handleRejectSubmit = async () => {
    if (!selectedRecordId || !rejectionReason.trim()) return;

    const id = selectedRecordId;
    setIsRejectOpen(false);

    setExitingCardId(id);
    setExitDirection('left');

    setTimeout(async () => {
      try {
        const isMock = getIsMockMode();
        if (isMock) {
          const stored = localStorage.getItem('dmrv-collections');
          if (stored) {
            const all = JSON.parse(stored);
            const updated = all.map((c: any) =>
              c.id === id
                ? {
                    ...c,
                    verification_status: 'rejected',
                    risk_score: 'high_risk',
                    rejection_reason: rejectionReason,
                  }
                : c
            );
            localStorage.setItem('dmrv-collections', JSON.stringify(updated));
            setCollections(updated);
          }

          // Local audit log
          const storedLogs = localStorage.getItem('dmrv-audit-logs') || '[]';
          const logs = JSON.parse(storedLogs);
          logs.push({
            id: 'log-' + Date.now(),
            actor_id: admin?.id || 'admin-uuid-9999',
            action: 'rejected',
            target_table: 'collection_records',
            target_id: id,
            metadata: { reason: rejectionReason },
            created_at: new Date().toISOString(),
          });
          localStorage.setItem('dmrv-audit-logs', JSON.stringify(logs));
        } else {
          // Supabase mode
          const { error: updateErr } = await supabase
            .from('collection_records')
            .update({ verification_status: 'rejected', risk_score: 'high_risk' })
            .eq('id', id);

          if (updateErr) throw new Error(updateErr.message);

          const { error: logErr } = await supabase
            .from('audit_logs')
            .insert({
              actor_id: admin?.id,
              action: 'rejected',
              target_table: 'collection_records',
              target_id: id,
              metadata: { reason: rejectionReason },
            });

          if (logErr) console.error('Failed to write audit log:', logErr);
          await fetchData();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setExitingCardId(null);
        setExitDirection(null);
        setSelectedRecordId(null);
        setRejectionReason('');
      }
    }, 500);
  };

  // Action: Request Clarification Submit
  const handleClarificationSubmit = async (id: string) => {
    if (!clarificationText.trim()) return;

    try {
      const isMock = getIsMockMode();
      if (isMock) {
        const stored = localStorage.getItem('dmrv-collections');
        if (stored) {
          const all = JSON.parse(stored);
          const updated = all.map((c: any) =>
            c.id === id
              ? {
                  ...c,
                  notes: c.notes ? `${c.notes} | Clarification note: ${clarificationText}` : `Clarification note: ${clarificationText}`,
                  clarification_requested: true,
                  clarification_note: clarificationText,
                }
              : c
          );
          localStorage.setItem('dmrv-collections', JSON.stringify(updated));
          setCollections(updated);
        }

        // Local audit log
        const storedLogs = localStorage.getItem('dmrv-audit-logs') || '[]';
        const logs = JSON.parse(storedLogs);
        logs.push({
          id: 'log-' + Date.now(),
          actor_id: admin?.id || 'admin-uuid-9999',
          action: 'clarification_requested',
          target_table: 'collection_records',
          target_id: id,
          metadata: { note: clarificationText },
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('dmrv-audit-logs', JSON.stringify(logs));
      } else {
        // Supabase mode
        const { error: updateErr } = await supabase
          .from('collection_records')
          .update({ notes: `Clarification requested: ${clarificationText}` })
          .eq('id', id);

        if (updateErr) throw new Error(updateErr.message);

        const { error: logErr } = await supabase
          .from('audit_logs')
          .insert({
            actor_id: admin?.id,
            action: 'clarification_requested',
            target_table: 'collection_records',
            target_id: id,
            metadata: { note: clarificationText },
          });

        if (logErr) console.error('Failed to write audit log:', logErr);
        await fetchData();
      }

      setOpenClarificationId(null);
      setClarificationText('');
      alert('Clarification request submitted to worker.');
    } catch (err) {
      console.error(err);
    }
  };

  // Filter records based on tab
  const getFilteredCollections = () => {
    if (activeTab === 'pending') {
      return collections.filter((c) => c.verification_status === 'pending_review');
    }
    return collections;
  };

  const filtered = getFilteredCollections();
  const pendingCount = collections.filter((c) => c.verification_status === 'pending_review').length;

  // Format waste type badge classes
  const getWasteTypeBadge = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      municipal_solid: {
        label: 'Municipal Solid',
        className: 'bg-blue-50/80 border border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-300',
      },
      organic: {
        label: 'Organic',
        className: 'bg-emerald-50/80 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300',
      },
      plastic: {
        label: 'Plastic',
        className: 'bg-cyan-50/80 border border-cyan-200 text-cyan-700 dark:bg-cyan-950/20 dark:border-cyan-900/30 dark:text-cyan-300',
      },
      construction: {
        label: 'Construction',
        className: 'bg-amber-50/80 border border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300',
      },
      mixed: {
        label: 'Mixed Waste',
        className: 'bg-zinc-100/80 border border-zinc-200 text-zinc-700 dark:bg-zinc-800/40 dark:border-zinc-800/60 dark:text-zinc-300',
      },
    };

    const item = config[type] || {
      label: type ? type.replace('_', ' ') : 'Mixed',
      className: 'bg-zinc-100 border border-zinc-200 text-zinc-700',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.className}`}>
        {item.label}
      </span>
    );
  };

  const getBadgeStatus = (status: string): 'pending' | 'verified' | 'flagged' => {
    if (status === 'verified') return 'verified';
    if (status === 'rejected') return 'flagged';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col pull-to-refresh">
      {/* Top Navbar */}
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-border/80 h-16 sticky top-0 z-50 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-muted/80 rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="bg-primary text-white p-1.5 rounded-lg border border-primary/20 shadow-sm flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">Verification Queue</h1>
            <p className="text-[9px] font-medium text-text-muted">Review operations anomalies</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs bg-primary-light border border-primary/20 text-primary font-bold px-2.5 py-0.5 rounded-md hidden sm:block">
            Role: Admin
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-danger hover:bg-danger/10 hover:text-danger h-8 w-8"
            title="Logout session"
          >
            <LogOut className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

      {/* Sticky Tab bar */}
      <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-border/60 sticky top-16 z-40 px-4 md:px-6 flex justify-center">
        <div className="max-w-md w-full py-1">
          <div className="flex w-full bg-muted/20 border border-border/40 rounded-lg p-[3px] text-xs">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-1.5 font-bold uppercase tracking-wider text-center rounded-md transition-all ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-zinc-800 text-primary shadow-xs border border-border/20'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 font-bold uppercase tracking-wider text-center rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-primary shadow-xs border border-border/20'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All Records
            </button>
          </div>
        </div>
      </div>

      {/* Main Review Workspace Container */}
      <main className="max-w-2xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="h-7 w-7 text-primary animate-spin" />
            <p className="text-xs text-text-muted">Loading review queue...</p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-dashed border-border/80 bg-white dark:bg-zinc-900 rounded-3xl space-y-4 shadow-sm animate-scale-up">
            <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-800/60 p-4 rounded-full text-primary dark:text-emerald-400 relative">
              <span className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping pointer-events-none" />
              <CheckCircle2 className="h-10 w-10 relative" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">All records reviewed</h3>
              <p className="text-xs text-text-muted max-w-xs leading-normal">
                Good work! There are no flagged records pending audit review at this time.
              </p>
            </div>
            {activeTab === 'pending' && collections.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border h-9"
                onClick={() => setActiveTab('all')}
              >
                View Historic Logs
              </Button>
            )}
          </div>
        ) : (
          /* Cards List */
          <div className="space-y-6 overflow-hidden">
            {filtered.map((record) => {
              const photos = getPhotos(record);
              const isExiting = exitingCardId === record.id;
              
              // Slide out styles
              const exitingClass = isExiting
                ? exitDirection === 'right'
                  ? 'translate-x-[150%] opacity-0 scale-95 border-emerald-300 bg-emerald-50/50 dark:border-emerald-700/40 dark:bg-emerald-950/10'
                  : '-translate-x-[150%] opacity-0 scale-95 border-red-300 bg-red-50/50 dark:border-red-950/10'
                : 'translate-x-0 opacity-100 scale-100 border-border/80 bg-white dark:bg-zinc-900/80';

              return (
                <Card
                  key={record.id}
                  className={`border shadow-sm overflow-hidden hover:shadow-md transition-all duration-500 ease-in-out transform ${exitingClass}`}
                >
                  {/* Top Section */}
                  <div className="p-4 border-b border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <HardHat className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-bold text-xs text-text-primary truncate">
                          {record.worker_name}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted font-bold tracking-tight mt-0.5 uppercase">
                        {record.site_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-zinc-400 font-bold flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(record.collected_at)}</span>
                      </span>
                      <StatusBadge status={getBadgeStatus(record.verification_status)} />
                    </div>
                  </div>

                  {/* Photo Section (Horizontally Scrollable Strip) */}
                  {photos.length > 0 && (
                    <div className="px-4 py-2 border-b border-border/30 bg-white dark:bg-zinc-900">
                      <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-zinc-200">
                        {photos.map((photo, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() => setLightboxPhoto(photo)}
                            className="relative h-20 w-28 rounded-lg overflow-hidden border border-zinc-200 cursor-pointer shrink-0 hover:scale-[0.98] hover:border-primary/50 transition-all shadow-3xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo}
                              alt={`Evidence ${pIdx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] text-white font-mono leading-none">
                              Photo {pIdx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Section (2-column Grid) */}
                  <CardContent className="p-4 grid grid-cols-2 gap-4 border-b border-border/30 bg-white dark:bg-zinc-900">
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Waste Category</span>
                      <div>{getWasteTypeBadge(record.waste_type)}</div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Quantity</span>
                      <span className="text-sm font-black font-mono text-text-primary tracking-tight">
                        {record.quantity.toLocaleString()} {record.unit}
                      </span>
                    </div>

                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">GPS Coordinates</span>
                      {record.gps_latitude && record.gps_longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${record.gps_latitude},${record.gps_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-bold"
                          title="Open coordinates in Google Maps"
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>📍 {record.gps_latitude.toFixed(5)}, {record.gps_longitude.toFixed(5)}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-danger font-bold">⚠️ GPS Location Missing</span>
                      )}
                    </div>

                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Exact Datetime</span>
                      <span className="text-[10px] font-mono font-bold text-text-muted flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>{formatExactDateTime(record.collected_at)}</span>
                      </span>
                    </div>

                    {/* Optional Submission Notes */}
                    {record.notes && (
                      <div className="col-span-2 bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg text-[10px] text-zinc-600 dark:bg-zinc-800/30 dark:border-zinc-800/40">
                        <span className="font-bold text-primary mr-1.5 uppercase text-[9px] tracking-wider block mb-0.5">Notes:</span>
                        <p className="italic leading-normal">"{record.notes}"</p>
                      </div>
                    )}
                  </CardContent>

                  {/* Anomalies Section (chips layout) */}
                  {record.anomalies && record.anomalies.length > 0 && (
                    <div className="p-4 bg-zinc-50/30 dark:bg-zinc-900/30 border-b border-border/30">
                      <div className="flex items-center gap-1 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                          Anomalies Detected ({record.anomalies.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {record.anomalies.map((anom: any) => (
                          <span
                            key={anom.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase border tracking-wide leading-none ${
                              anom.severity === 'high_risk'
                                ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
                                : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            {anom.details || anom.message || anom.anomaly_type.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar (Footer) */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 flex flex-col gap-2.5">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(record.id)}
                        disabled={isExiting}
                        className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold h-9 text-xs shadow-xs rounded-lg active:scale-98 transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </Button>
                      
                      <Button
                        onClick={() => handleRejectClick(record.id)}
                        disabled={isExiting}
                        className="flex-1 bg-danger hover:bg-danger-dark text-white font-bold h-9 text-xs shadow-xs rounded-lg active:scale-98 transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>

                      <Button
                        onClick={() => {
                          setOpenClarificationId(openClarificationId === record.id ? null : record.id);
                          setClarificationText('');
                        }}
                        disabled={isExiting}
                        variant="outline"
                        className="border-border text-text-muted hover:text-text-primary h-9 px-3 shrink-0 rounded-lg active:scale-98 transition-all flex items-center justify-center"
                        title="Request Worker Clarification"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Inline Clarification Input */}
                    {openClarificationId === record.id && (
                      <div className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-2.5 animate-slide-down shadow-2xs">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">
                          Reason for Clarification Request
                        </span>
                        <textarea
                          value={clarificationText}
                          onChange={(e) => setClarificationText(e.target.value)}
                          placeholder="e.g. Photo proof is too blurry to identify. Please capture evidence under better lighting."
                          rows={2}
                          className="w-full text-xs p-2 bg-zinc-50/50 dark:bg-zinc-900 border border-border/80 focus:border-primary focus:ring-primary focus-visible:outline-none rounded-lg"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setOpenClarificationId(null);
                              setClarificationText('');
                            }}
                            className="h-8 text-xs font-bold px-3 rounded-md"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={!clarificationText.trim()}
                            onClick={() => handleClarificationSubmit(record.id)}
                            className="h-8 bg-primary hover:bg-primary-dark text-white text-xs font-bold px-3 rounded-md shadow-2xs active:scale-95 transition-all"
                          >
                            Send Clarification
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Fullscreen Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white p-2.5 rounded-full transition-all"
          >
            <XCircle className="h-6 w-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto}
              alt="Evidence Max Size"
              className="max-h-[80vh] max-w-full object-contain rounded-lg border border-white/10 shadow-2xl animate-scale-up"
            />
          </div>
        </div>
      )}

      {/* Reject Reason Confirmation Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-[400px] rounded-xl bg-white/95 backdrop-blur-md border border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-text-primary flex items-center gap-1.5 text-danger">
              <AlertTriangle className="h-5 w-5" />
              <span>Flag & Reject Collection Proof</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted mt-1 leading-normal">
              State the reason for rejecting this collection log. A valid feedback note is required to process the rejection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3">
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Evidence photo mismatch (contains plastic instead of municipal waste)"
              rows={3}
              className="w-full text-xs p-2.5 bg-zinc-50 border border-border/80 focus:border-danger focus:ring-danger focus-visible:outline-none rounded-lg"
            />
          </div>

          <DialogFooter className="flex-row gap-2 justify-end sm:space-x-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRejectOpen(false);
                setSelectedRecordId(null);
              }}
              className="text-xs font-bold h-9 px-3 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!rejectionReason.trim()}
              onClick={handleRejectSubmit}
              className="bg-danger hover:bg-danger-dark text-white text-xs font-bold h-9 px-4 rounded-lg shadow-sm active:scale-95 transition-all"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
