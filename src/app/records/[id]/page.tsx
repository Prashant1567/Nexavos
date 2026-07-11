'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PhotoCard } from '@/components/shared/PhotoCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  ArrowLeft,
  MapPin,
  Calendar,
  HardHat,
  Clock,
  CheckCircle,
  AlertTriangle,
  Map,
  FileText,
} from 'lucide-react';

export default function RecordDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [admin, setAdmin] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('dmrv-user');
    if (!storedUser) {
      router.push('/auth/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.full_name === 'Anjali Sharma (Admin)' || parsedUser.full_name === 'Anjali Sharma') {
      parsedUser.full_name = 'Prashant';
      localStorage.setItem('dmrv-user', JSON.stringify(parsedUser));
    }
    setAdmin(parsedUser);

    const localData = localStorage.getItem('dmrv-collections');
    if (localData) {
      const parsedCollections = JSON.parse(localData);
      setCollections(parsedCollections);
      const found = parsedCollections.find((c: any) => c.id === id);
      if (found) {
        setRecord(found);
      }
    }
  }, [id, router]);

  // Handle local state updates for verification actions
  const handleVerify = () => {
    if (!record) return;
    const updatedRecord = {
      ...record,
      verification_status: 'verified' as const,
      verified_at: new Date().toISOString(),
      verified_by: admin?.id || 'admin-uuid-9999',
      risk_score: 'normal' as const,
    };

    const updatedCollections = collections.map((c) => (c.id === record.id ? updatedRecord : c));
    setRecord(updatedRecord);
    setCollections(updatedCollections);
    localStorage.setItem('dmrv-collections', JSON.stringify(updatedCollections));
  };

  const handleFlag = () => {
    if (!record) return;
    const updatedRecord = {
      ...record,
      verification_status: 'rejected' as const,
      verified_at: new Date().toISOString(),
      verified_by: admin?.id || 'admin-uuid-9999',
      risk_score: 'high_risk' as const,
      rejection_reason: 'Flagged by auditor directly from detailed inspection page.',
    };

    const updatedCollections = collections.map((c) => (c.id === record.id ? updatedRecord : c));
    setRecord(updatedRecord);
    setCollections(updatedCollections);
    localStorage.setItem('dmrv-collections', JSON.stringify(updatedCollections));
  };

  if (!record) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-surface">
        <p className="text-sm text-text-muted">Record not found or loading...</p>
        <Link href="/dashboard" className="text-xs text-primary font-bold mt-2 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Formatting times
  const captureTime = new Date(record.collected_at || record.captured_at).toLocaleString('en-IN');
  const submitTime = record.submitted_at ? new Date(record.submitted_at).toLocaleString('en-IN') : 'N/A';
  const timeDriftSec = record.submitted_at 
    ? Math.round((new Date(record.submitted_at).getTime() - new Date(record.collected_at || record.captured_at).getTime()) / 1000)
    : 0;

  const getBadgeStatus = (status: string): 'pending' | 'verified' | 'flagged' => {
    if (status === 'verified') return 'verified';
    if (status === 'rejected') return 'flagged';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-border py-4 px-6 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="mr-2 hover:bg-muted p-1.5 rounded-lg text-text-muted hover:text-text-primary">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="bg-primary text-white p-2 rounded-xl border border-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Audit Log Ledger</h1>
              <p className="text-[10px] text-text-muted">Verifiable cryptographic evidence review</p>
            </div>
          </div>
          <span className="text-xs bg-primary-light border border-primary/20 text-primary font-bold px-2 py-0.5 rounded">
            Record ID: {record.id.substring(0, 8)}
          </span>
        </div>
      </header>

      {/* Workspace Grid */}
      <main className="max-w-5xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Evidence & Metadata */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Photo Evidence Card */}
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Visual Proof Evidence</h3>
            <PhotoCard
              photoUrl={record.image_url || record.photo_url}
              photoHash={record.photo_hash}
              capturedAt={record.collected_at || record.captured_at}
              metadata={record.device_metadata}
            />
          </div>

          {/* Collection Metadata Details */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text-primary">Audit Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* Type, Quantity & Status */}
              <div className="flex justify-between items-center bg-surface border border-border/40 p-3 rounded-xl">
                <div>
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Waste Stream</span>
                  <span className="text-sm font-bold text-primary capitalize mt-0.5 block">{record.waste_type.replace('_', ' ')}</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Quantity</span>
                  <span className="text-lg font-extrabold font-mono text-text-primary mt-0.5 block">{record.quantity} {record.unit}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-text-muted block">Status</span>
                  <div className="mt-0.5 block">
                    <StatusBadge status={getBadgeStatus(record.verification_status)} />
                  </div>
                </div>
              </div>

              {/* Field Notes display */}
              {record.notes && (
                <div className="p-3 bg-surface border border-border/40 rounded-xl flex items-start gap-2">
                  <FileText className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-text-muted block">Field Notes</span>
                    <span className="text-xs text-text-primary italic mt-0.5 block">"{record.notes}"</span>
                  </div>
                </div>
              )}

              {/* Spatial Location Details */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Map className="h-3.5 w-3.5 text-primary" />
                  <span>GPS Spatial Verification</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface/50 p-3 rounded-lg border border-border/40 font-mono">
                  <div>
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Latitude</span>
                    <span className="text-text-primary mt-0.5 block font-semibold">{record.gps_latitude?.toFixed(6) || 28.6139}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Longitude</span>
                    <span className="text-text-primary mt-0.5 block font-semibold">{record.gps_longitude?.toFixed(6) || 77.2090}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Accuracy Limit</span>
                    <span className="text-primary mt-0.5 block font-semibold font-sans">± {Math.round(record.gps_accuracy || 0)} meters</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Geofence Check</span>
                    <span className="text-text-primary mt-0.5 block font-sans font-semibold">
                      {record.anomalies?.some((a: any) => a.anomaly_type === 'gps_mismatch') ? '⚠️ Breach' : '✓ Within Range'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Temporal Timestamp Details */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Temporal Timeline Verification</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs bg-surface/50 p-3 rounded-lg border border-border/40 font-mono">
                  <div>
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Device Capture Time</span>
                    <span className="text-text-primary mt-0.5 block font-semibold">{captureTime}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Server Ledger Time</span>
                    <span className="text-text-primary mt-0.5 block font-semibold">{submitTime}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-sans font-bold text-text-muted block leading-none">Network Upload Sync Latency</span>
                    <span className="text-text-primary mt-0.5 block font-semibold font-sans">
                      {timeDriftSec === 0 ? 'Instantaneous upload' : `${timeDriftSec} seconds (Cached offline)`}
                    </span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Diagnostic Audit logs */}
        <div className="space-y-6">
          
          {/* Anomalies list */}
          <Card className={`border shadow-xs ${record.anomalies?.length > 0 ? 'border-danger/30 bg-danger/5' : 'border-border/80'}`}>
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                <span>Verification Diagnostics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3">
              {record.anomalies && record.anomalies.length > 0 ? (
                <div className="space-y-2">
                  {record.anomalies.map((anom: any) => (
                    <div key={anom.id} className="p-2.5 bg-white border border-danger/25 rounded-lg flex items-start gap-2 shadow-3xs">
                      <AlertTriangle className="h-4.5 w-4.5 text-danger shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-text-primary block leading-snug">{anom.details}</span>
                        <span className="text-[9px] text-danger font-bold uppercase tracking-wider block mt-0.5">
                          {anom.severity === 'high_risk' ? 'High Risk' : 'Warning'} FLAG
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-text-muted space-y-1">
                  <CheckCircle className="h-8 w-8 text-primary mx-auto opacity-70" />
                  <p className="font-semibold text-[11px] text-primary">No Anomalies Found</p>
                  <p className="text-[10px] text-text-muted leading-tight">Spatial, temporal and image checks passed successfully.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker Profile Card */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <HardHat className="h-4.5 w-4.5 text-text-muted" />
                <span>Field Operator Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <div>
                <p className="text-[9px] uppercase font-bold text-text-muted">Operator Name</p>
                <p className="font-bold text-text-primary text-sm mt-0.5">{record.worker_name || 'Rajesh Kumar'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <p className="text-[9px] font-sans uppercase font-bold text-text-muted">Operator ID</p>
                  <p className="font-semibold text-text-primary mt-0.5">{record.worker_id.substring(0, 8)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-sans uppercase font-bold text-text-muted">Submissions Today</p>
                  <p className="font-semibold text-text-primary mt-0.5">14 records</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auditor Verification Actions Panel */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text-primary">Auditor Verification</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3">
              {record.verification_status === 'pending_review' ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-text-muted leading-normal mb-1">
                    Please review the photo evidence, GPS coordinates, and device diagnostic checks. Select verify if the waste activity actually occurred, or flag if suspicious.
                  </p>
                  <Button
                    onClick={handleVerify}
                    className="w-full h-10 text-xs font-bold bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 rounded-lg"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve & Verify Record</span>
                  </Button>
                  <Button
                    onClick={handleFlag}
                    className="w-full h-10 text-xs font-bold bg-danger/10 text-danger hover:bg-danger/15 flex items-center justify-center gap-1.5 rounded-lg"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Flag as Anomaly / Reject</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 p-2 bg-surface rounded-lg border border-border/40 text-xs">
                    <ShieldCheck className="h-4.5 w-4.5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-muted leading-none">Audited by Admin</p>
                      <p className="font-semibold text-[11px] text-text-primary mt-1">{admin?.full_name || 'Prashant'}</p>
                    </div>
                  </div>
                  {record.verified_at && (
                    <div className="text-[10px] text-text-muted font-mono leading-tight">
                      Audited On: {new Date(record.verified_at).toLocaleString('en-IN')}
                    </div>
                  )}
                  {record.rejection_reason && (
                    <div className="p-2.5 bg-danger/5 border border-danger/15 rounded-lg text-[10px] text-danger font-medium leading-relaxed">
                      <span className="font-bold uppercase tracking-wider block mb-0.5">Auditor Notes:</span>
                      {record.rejection_reason}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
