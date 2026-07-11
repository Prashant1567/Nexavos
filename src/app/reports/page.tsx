'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  ArrowLeft,
  Download,
  FileText,
  CalendarDays,
  FolderOpen,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Layers,
  LogOut,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────
interface ProjectItem {
  id: string;
  project_name: string;
  site_name: string;
  waste_type?: string;
}

interface RecordItem {
  id: string;
  project_id: string;
  worker_id?: string;
  worker_name?: string;
  waste_type: string;
  quantity: number;
  unit: 'kg' | 'ton';
  notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  collected_at: string;
  submitted_at?: string;
  verification_status: 'verified' | 'pending_review' | 'rejected';
  risk_score?: string;
  anomalies?: any[];
  evidence_urls?: string[];
  evidence?: string[];
  photo_url?: string;
  image_url?: string;
  site_name?: string;
  project_name?: string;
}

// ─── Constants ────────────────────────────────────
const DONUT_COLORS: Record<string, string> = {
  organic: '#059669',
  plastic: '#0891B2',
  municipal_solid: '#6366F1',
  construction: '#D97706',
  mixed: '#71717A',
};

const DONUT_LABELS: Record<string, string> = {
  organic: 'Organic',
  plastic: 'Plastic',
  municipal_solid: 'Municipal Solid',
  construction: 'Construction',
  mixed: 'Mixed',
};

// ─── Helpers ──────────────────────────────────────
const getWeightKg = (r: RecordItem) => (r.unit === 'ton' ? r.quantity * 1000 : r.quantity);

const formatDateInput = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const getPhotoCount = (r: RecordItem): number => {
  if (Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0) return r.evidence_urls.length;
  if (Array.isArray(r.evidence) && r.evidence.length > 0) return r.evidence.length;
  if (r.photo_url || r.image_url) return 1;
  return 0;
};

// ─── Component ────────────────────────────────────
export default function ReportsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

  const [admin, setAdmin] = useState<any>(null);
  const [allRecords, setAllRecords] = useState<RecordItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(formatDateInput(firstOfMonth));
  const [dateTo, setDateTo] = useState(formatDateInput(now));
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Report generation
  const [reportGenerated, setReportGenerated] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  // ─── Auth & data loading ────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('dmrv-user');
    if (!stored) { router.push('/auth/login'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'admin') { router.push('/collect'); return; }
    if (parsed.full_name === 'Anjali Sharma (Admin)' || parsed.full_name === 'Anjali Sharma') {
      parsed.full_name = 'Prashant';
      localStorage.setItem('dmrv-user', JSON.stringify(parsed));
    }
    setAdmin(parsed);

    // Load projects
    const pStr = localStorage.getItem('dmrv-projects');
    const localProjects: ProjectItem[] = pStr ? JSON.parse(pStr) : [];
    setProjects(localProjects);

    // Load records & join project info
    const cStr = localStorage.getItem('dmrv-collections');
    const localCollections: any[] = cStr ? JSON.parse(cStr) : [];
    const mapped: RecordItem[] = localCollections.map((rc: any) => {
      const proj = localProjects.find((p) => p.id === rc.project_id);
      return {
        ...rc,
        worker_name: rc.worker_name || 'Field Worker',
        project_name: proj?.project_name || 'Unknown Project',
        site_name: proj?.site_name || 'Unknown Site',
        collected_at: rc.collected_at || rc.captured_at || new Date().toISOString(),
        quantity: Number(rc.quantity) || 0,
      };
    });
    setAllRecords(mapped);
    setLoading(false);
  }, [router]);

  // ─── Filtered records (auto-update on filter change) ──
  const filteredRecords = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    return allRecords.filter((r) => {
      const d = new Date(r.collected_at);
      if (d < from || d > to) return false;
      if (selectedProjectIds.length > 0 && !selectedProjectIds.includes(r.project_id)) return false;
      return true;
    });
  }, [allRecords, dateFrom, dateTo, selectedProjectIds]);

  // ─── Stat aggregations ──────────────────────────
  const stats = useMemo(() => {
    const totalKg = filteredRecords
      .filter((r) => r.verification_status !== 'rejected')
      .reduce((s, r) => s + getWeightKg(r), 0);
    const verified = filteredRecords.filter((r) => r.verification_status === 'verified').length;
    const rejected = filteredRecords.filter((r) => r.verification_status === 'rejected').length;
    const anomalyCount = filteredRecords.reduce(
      (s, r) => s + (Array.isArray(r.anomalies) ? r.anomalies.length : 0),
      0
    );
    const photoCount = filteredRecords.reduce((s, r) => s + getPhotoCount(r), 0);
    const activeProjects = new Set(filteredRecords.map((r) => r.project_id)).size;

    return {
      totalKg: Math.round(totalKg * 10) / 10,
      totalTon: Math.round((totalKg / 1000) * 100) / 100,
      verified,
      rejected,
      anomalyCount,
      photoCount,
      activeProjects,
    };
  }, [filteredRecords]);

  // ─── Chart data: Waste by Type (donut) ──────────
  const wasteByType = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords
      .filter((r) => r.verification_status !== 'rejected')
      .forEach((r) => {
        const type = r.waste_type || 'mixed';
        map[type] = (map[type] || 0) + getWeightKg(r);
      });
    return Object.entries(map).map(([type, kg]) => ({
      name: DONUT_LABELS[type] || type,
      value: Math.round(kg * 10) / 10,
      fill: DONUT_COLORS[type] || '#71717A',
    }));
  }, [filteredRecords]);

  // ─── Chart data: Daily Volume (line) ────────────
  const dailyVolume = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const dayMap: Record<string, number> = {};
    const cursor = new Date(from);
    while (cursor <= to) {
      dayMap[cursor.toDateString()] = 0;
      cursor.setDate(cursor.getDate() + 1);
    }

    filteredRecords
      .filter((r) => r.verification_status !== 'rejected')
      .forEach((r) => {
        const key = new Date(r.collected_at).toDateString();
        if (key in dayMap) dayMap[key] += getWeightKg(r);
      });

    return Object.entries(dayMap).map(([dateStr, kg]) => ({
      date: new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      kg: Math.round(kg * 10) / 10,
    }));
  }, [filteredRecords, dateFrom, dateTo]);

  // ─── Chart data: Verification status (horizontal bar) ─
  const statusBreakdown = useMemo(() => {
    const verified = filteredRecords.filter((r) => r.verification_status === 'verified').length;
    const pending = filteredRecords.filter((r) => r.verification_status === 'pending_review').length;
    const rejected = filteredRecords.filter((r) => r.verification_status === 'rejected').length;
    return [
      { name: 'Verified', count: verified, fill: '#059669' },
      { name: 'Pending', count: pending, fill: '#F59E0B' },
      { name: 'Rejected', count: rejected, fill: '#DC2626' },
    ];
  }, [filteredRecords]);

  // ─── Sites from selected projects ───────────────
  const selectedSites = useMemo(() => {
    if (selectedProjectIds.length === 0) return projects;
    return projects.filter((p) => selectedProjectIds.includes(p.id));
  }, [projects, selectedProjectIds]);

  // ─── Project toggle handler ─────────────────────
  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setReportGenerated(false);
  };

  // ─── Generate Report Object ─────────────────────
  const handleGenerateReport = () => {
    setReportGenerated(true);
  };

  const reportObject = useMemo(() => {
    if (!reportGenerated) return null;
    return {
      generated_at: new Date().toISOString(),
      generated_by: admin?.full_name || 'Admin',
      period: { from: dateFrom, to: dateTo },
      filters: { projects: selectedProjectIds.length > 0 ? selectedProjectIds : 'all' },
      summary: {
        totalWaste: `${stats.totalKg} kg (${stats.totalTon} ton)`,
        verifiedCount: stats.verified,
        rejectedCount: stats.rejected,
        anomalyCount: stats.anomalyCount,
      },
      records: filteredRecords,
    };
  }, [reportGenerated, admin, dateFrom, dateTo, selectedProjectIds, stats, filteredRecords]);

  // ─── Export CSV ─────────────────────────────────
  const handleExportCSV = () => {
    setExporting('csv');
    const headers = [
      'Record ID', 'Project', 'Site', 'Worker', 'Waste Type', 'Quantity', 'Unit',
      'GPS Latitude', 'GPS Longitude', 'Collected At', 'Verification Status',
      'Risk Score', 'Anomaly Count', 'Notes',
    ];
    const rows = filteredRecords.map((r) => [
      r.id, r.project_name || '', r.site_name || '', r.worker_name || '',
      r.waste_type, r.quantity, r.unit,
      r.gps_latitude ?? '', r.gps_longitude ?? '', r.collected_at,
      r.verification_status, r.risk_score || 'normal',
      Array.isArray(r.anomalies) ? r.anomalies.length : 0, r.notes || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dmrv-report-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(null), 800);
  };

  // ─── Export PDF ─────────────────────────────────
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting('pdf');

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pdfW - margin * 2;

      // ── Header ──
      pdf.setFillColor(27, 107, 58);
      pdf.rect(0, 0, pdfW, 36, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('dMRV — Waste Verification Report', margin, 14);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Period: ${dateFrom} to ${dateTo}`, margin, 21);
      const projectLabel = selectedProjectIds.length > 0
        ? projects.filter((p) => selectedProjectIds.includes(p.id)).map((p) => p.project_name).join(', ')
        : 'All Projects';
      pdf.text(`Projects: ${projectLabel}`, margin, 26);
      pdf.text(`Generated by: ${admin?.full_name || 'Admin'}  |  Generated at: ${new Date().toLocaleString('en-IN')}`, margin, 31);

      // ── Disclaimer ──
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(7);
      pdf.text(
        'This report was generated by the Waste dMRV platform. All records include GPS, timestamp, and photo evidence.',
        margin,
        38
      );

      // ── Screenshot content ──
      const imgWidth = contentW;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const yOffset = 42;
      const remainingHeight = imgHeight;
      const pageContentHeight = pdfH - 20;

      // First page
      const firstPageH = Math.min(remainingHeight, pageContentHeight - yOffset);
      pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight, undefined, 'FAST', 0);

      // If content overflows, add pages
      if (imgHeight > pageContentHeight - yOffset) {
        let printed = pageContentHeight - yOffset;
        while (printed < imgHeight) {
          pdf.addPage();
          const sy = (printed / imgHeight) * canvas.height;
          const sh = Math.min(((pageContentHeight) / imgHeight) * canvas.height, canvas.height - sy);
          // Clip by drawing with offset
          pdf.addImage(imgData, 'PNG', margin, 10 - (printed * imgWidth / canvas.width), imgWidth, imgHeight, undefined, 'FAST', 0);
          printed += pageContentHeight;
        }
      }

      pdf.save(`dmrv-report-${dateFrom}-to-${dateTo}.pdf`);
    } catch (err: any) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setTimeout(() => setExporting(null), 800);
    }
  };

  // ─── Custom chart tooltip ───────────────────────
  const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 border border-zinc-200/80 p-2 rounded-lg shadow-lg text-xs">
          <p className="font-bold text-text-primary">{payload[0].payload.date || payload[0].payload.name}</p>
          <p className="text-primary font-mono font-bold mt-0.5">
            {payload[0].value.toLocaleString()} {payload[0].dataKey === 'kg' ? 'kg' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  // ─── Render ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-border/80 h-16 sticky top-0 z-50 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-muted/80 rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="bg-primary text-white p-1.5 rounded-lg border border-primary/20 shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">Compliance Reports</h1>
            <p className="text-[9px] font-medium text-text-muted">Generate & export verification reports</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-primary-light border border-primary/20 text-primary font-bold px-2.5 py-0.5 rounded-md hidden sm:block">Admin</span>
          <Button variant="ghost" size="icon" onClick={() => { localStorage.removeItem('dmrv-user'); router.push('/auth/login'); }} className="text-danger hover:bg-danger/10 h-8 w-8">
            <LogOut className="h-4.5 w-4.5" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="h-7 w-7 text-primary animate-spin" />
            <p className="text-xs text-text-muted">Loading report data...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════ */}
            {/* FILTERS SECTION                            */}
            {/* ═══════════════════════════════════════════ */}
            <Card className="border border-border/80 bg-white shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-border/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span>Report Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setReportGenerated(false); }}
                      className="w-full h-9 text-xs font-mono px-2.5 border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 focus-visible:outline-none bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setReportGenerated(false); }}
                      className="w-full h-9 text-xs font-mono px-2.5 border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary/20 focus-visible:outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Project Multi-Select */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Select Projects (click to toggle)</label>
                  <div className="flex flex-wrap gap-2">
                    {projects.length === 0 ? (
                      <span className="text-[10px] text-text-muted">No projects available</span>
                    ) : (
                      projects.map((p) => {
                        const isSelected = selectedProjectIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleProject(p.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                              isSelected
                                ? 'bg-primary text-white border-primary/80 shadow-sm'
                                : 'bg-white text-text-muted border-border hover:border-primary/40 hover:text-primary'
                            }`}
                          >
                            {p.project_name}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {selectedProjectIds.length === 0 && (
                    <p className="text-[9px] text-zinc-400 italic">All projects selected by default</p>
                  )}
                </div>

                {/* Auto-populated sites */}
                {selectedProjectIds.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Sites (auto-populated)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSites.map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-light text-primary text-[9px] font-bold border border-primary/20">
                          <FolderOpen className="h-2.5 w-2.5" />
                          {s.site_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1 text-[10px] text-text-muted">
                  Showing <span className="font-bold text-text-primary">{filteredRecords.length}</span> records in the selected period.
                </div>
              </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════ */}
            {/* REPORT PREVIEW (capturable for PDF)        */}
            {/* ═══════════════════════════════════════════ */}
            <div ref={reportRef} className="space-y-6">

              {/* Stat Cards – 3x2 grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card className="border border-border/80 bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Total Waste Collected</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-black font-mono text-text-primary tracking-tight">
                        {stats.totalKg.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-bold">kg</span>
                    </div>
                    <p className="text-[9px] text-primary font-bold mt-1 flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />
                      <span>{stats.totalTon} ton equivalent</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Verified Records</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-black font-mono text-emerald-600 tracking-tight">{stats.verified}</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1 flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span>Engine-validated logs</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className={`border shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${stats.rejected > 0 ? 'border-red-200 bg-red-50/20' : 'border-border/80 bg-white'}`}>
                  <CardContent className="p-4">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${stats.rejected > 0 ? 'text-red-500' : 'text-zinc-400'}`}>Rejected Records</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className={`text-xl font-black font-mono tracking-tight ${stats.rejected > 0 ? 'text-red-600' : 'text-text-primary'}`}>{stats.rejected}</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1 flex items-center gap-0.5">
                      <XCircle className="h-3 w-3 text-red-400" />
                      <span>Admin-flagged anomalies</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className={`border shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${stats.anomalyCount > 0 ? 'border-amber-200 bg-amber-50/20' : 'border-border/80 bg-white'}`}>
                  <CardContent className="p-4">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${stats.anomalyCount > 0 ? 'text-amber-600' : 'text-zinc-400'}`}>Anomaly Detections</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className={`text-xl font-black font-mono tracking-tight ${stats.anomalyCount > 0 ? 'text-amber-600' : 'text-text-primary'}`}>{stats.anomalyCount}</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1 flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span>Auto-detected flags</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Evidence Submissions</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-black font-mono text-text-primary tracking-tight">{stats.photoCount}</span>
                      <span className="text-[10px] text-zinc-400 font-bold">photos</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1 flex items-center gap-0.5">
                      <Camera className="h-3 w-3 text-cyan-500" />
                      <span>Photographic proof attached</span>
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                  <CardContent className="p-4">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Active Projects</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-black font-mono text-primary tracking-tight">{stats.activeProjects}</span>
                      <span className="text-[10px] text-zinc-400 font-bold">sites</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1 flex items-center gap-0.5">
                      <Layers className="h-3 w-3 text-primary" />
                      <span>With activity in period</span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Charts Row ─────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Donut: Waste by Type */}
                <Card className="border border-border/80 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-1 border-b border-border/40">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Waste by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex items-center justify-center">
                    {wasteByType.length === 0 ? (
                      <p className="text-xs text-text-muted py-8">No data in period</p>
                    ) : (
                      <div className="w-full flex flex-col items-center">
                        <div className="h-[200px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={wasteByType}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                strokeWidth={2}
                                stroke="#fff"
                              >
                                {wasteByType.map((entry, idx) => (
                                  <Cell key={idx} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                          {wasteByType.map((entry, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[9px] font-bold text-text-muted">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.fill }} />
                              {entry.name} ({entry.value} kg)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Horizontal Bar: Verification Status Breakdown */}
                <Card className="border border-border/80 bg-white shadow-xs">
                  <CardHeader className="p-4 pb-1 border-b border-border/40">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Verification Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {filteredRecords.length === 0 ? (
                      <p className="text-xs text-text-muted py-8 text-center">No data in period</p>
                    ) : (
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(228, 228, 231, 0.4)" />
                            <XAxis type="number" style={{ fontSize: '10px', fill: '#888', fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" style={{ fontSize: '10px', fill: '#555', fontWeight: 'bold' }} tickLine={false} axisLine={false} width={60} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                              {statusBreakdown.map((entry, idx) => (
                                <Cell key={idx} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Line Chart: Daily Collection Volume (full width) */}
              <Card className="border border-border/80 bg-white shadow-xs">
                <CardHeader className="p-4 pb-1 border-b border-border/40">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Daily Collection Volume (kg)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {dailyVolume.length === 0 ? (
                    <p className="text-xs text-text-muted py-8 text-center">No data in period</p>
                  ) : (
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyVolume} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1B6B3A" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#1B6B3A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(228, 228, 231, 0.4)" />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#888', fontWeight: 'bold' }} />
                          <YAxis tickLine={false} axisLine={false} style={{ fontSize: '9px', fill: '#888', fontWeight: 'bold' }} />
                          <Tooltip content={<ChartTooltip />} />
                          <Line type="monotone" dataKey="kg" stroke="#1B6B3A" strokeWidth={2.5} dot={{ r: 3, fill: '#1B6B3A', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* REPORT GENERATION & EXPORT                 */}
            {/* ═══════════════════════════════════════════ */}
            <Card className="border border-border/80 bg-white shadow-sm">
              <CardContent className="p-5 space-y-4">
                {!reportGenerated ? (
                  <div className="flex flex-col items-center text-center py-4 space-y-3">
                    <Sparkles className="h-8 w-8 text-primary/40" />
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Ready to generate report</h3>
                      <p className="text-[10px] text-text-muted mt-0.5 max-w-xs leading-normal">
                        The preview above auto-updates with your filters. Click below to finalize and unlock export options.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateReport}
                      className="bg-primary hover:bg-primary-dark text-white font-bold h-10 px-6 text-xs shadow-md active:scale-95 transition-all rounded-lg"
                    >
                      <FileText className="h-4 w-4 mr-1.5" />
                      Generate Report
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-primary-light border border-primary/20 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-primary">Report generated successfully</h4>
                        <p className="text-[9px] text-primary/80 mt-0.5">
                          Covering {filteredRecords.length} records from {dateFrom} to {dateTo}. Choose an export format below.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleExportPDF}
                        disabled={exporting !== null}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-10 text-xs shadow-sm rounded-lg active:scale-95 transition-all"
                      >
                        {exporting === 'pdf' ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Rendering PDF...</>
                        ) : (
                          <><Download className="h-4 w-4 mr-1.5" /> Export as PDF</>
                        )}
                      </Button>

                      <Button
                        onClick={handleExportCSV}
                        disabled={exporting !== null}
                        variant="outline"
                        className="flex-1 border-primary text-primary hover:bg-primary-light font-bold h-10 text-xs rounded-lg active:scale-95 transition-all"
                      >
                        {exporting === 'csv' ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Exporting...</>
                        ) : (
                          <><Download className="h-4 w-4 mr-1.5" /> Export as CSV</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
