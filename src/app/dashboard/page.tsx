'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDashboardData, CollectionRecord, Project } from '@/hooks/useDashboardData';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ShieldCheck,
  Bell,
  LogOut,
  ChevronRight,
  Plus,
  MapPin,
  HardHat,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Inbox,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Filters State for Records Tab
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');

  const { records, projects, stats, loading, error, isRealtime, refetch } = useDashboardData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('dmrv-user');
    router.push('/auth/login');
  };

  // Helper for dynamic time-of-day greeting
  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good morning';
    if (hrs < 17) return 'Good afternoon';
    return 'Good evening';
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

  // Format waste type badge
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

  // Format risk badge
  const getRiskBadge = (score: string) => {
    const config: Record<string, { label: string; className: string }> = {
      normal: {
        label: 'Normal',
        className: 'bg-zinc-50 border border-zinc-200/60 text-zinc-500 dark:bg-zinc-900/30 dark:border-zinc-800/50 dark:text-zinc-400',
      },
      warning: {
        label: 'Warning',
        className: 'bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400',
      },
      high_risk: {
        label: 'High Risk',
        className: 'bg-red-50 border border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 animate-pulse',
      },
    };

    const item = config[score] || {
      label: score || 'Normal',
      className: 'bg-zinc-50 border border-zinc-200 text-zinc-500',
    };

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${item.className}`}>
        {item.label}
      </span>
    );
  };

  // Convert status string to badge status
  const getBadgeStatus = (status: string): 'pending' | 'verified' | 'flagged' => {
    if (status === 'verified') return 'verified';
    if (status === 'rejected') return 'flagged';
    return 'pending';
  };

  // Filter records based on selected options
  const getFilteredRecords = () => {
    return records.filter((r) => {
      // 1. Project Filter
      if (filterProject !== 'all' && r.project_id !== filterProject) return false;

      // 2. Status Filter
      if (filterStatus !== 'all' && r.verification_status !== filterStatus) return false;

      // 3. Risk Filter
      if (filterRisk !== 'all' && r.risk_score !== filterRisk) return false;

      // 4. Date Range Filter
      if (filterDateRange !== 'all') {
        const recordDate = new Date(r.collected_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterDateRange === 'today') {
          if (recordDate < today) return false;
        } else if (filterDateRange === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          if (recordDate < sevenDaysAgo) return false;
        }
      }

      return true;
    });
  };

  // Handle clicking "Review Now" on alert strip
  const handleReviewNow = () => {
    setFilterStatus('pending_review');
    setFilterRisk('high_risk');
    setActiveTab('records');
  };

  // Handle bell icon click: filter for pending verification records
  const handleBellClick = () => {
    setFilterStatus('pending_review');
    setFilterRisk('all');
    setActiveTab('records');
  };

  const filteredRecords = getFilteredRecords();

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/80 dark:border-zinc-800/80 p-2.5 rounded-xl shadow-lg backdrop-blur-md">
          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{payload[0].payload.dayLabel}</p>
          <p className="text-sm font-extrabold text-primary dark:text-emerald-400 mt-0.5">
            {payload[0].value.toLocaleString()} kg
          </p>
        </div>
      );
    }
    return null;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-text-muted mt-2">Loading operational interface...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col pb-16 pull-to-refresh">
      {/* Top Bar */}
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-border/80 h-16 sticky top-0 z-50 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-white p-2 rounded-xl border border-primary/20 shadow-sm flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">{getGreeting()}, {admin?.full_name || 'Admin'}</h1>
            <p className="text-[9px] font-medium text-text-muted flex items-center gap-1">
              <span>Waste Verification Engine</span>
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] text-emerald-600 font-bold capitalize">
                {isRealtime ? 'Live feed active' : 'Offline sync'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          {/* Notification Bell */}
          <button
            onClick={handleBellClick}
            className="relative p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-muted/80 transition-colors"
            title="Inspect Pending Review Queue"
          >
            <Bell className="h-5 w-5" />
            {stats.pendingReviewCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-black text-white ring-2 ring-white">
                {stats.pendingReviewCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
              {admin?.full_name ? admin.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'AD'}
            </div>
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
        </div>
      </header>

      {/* Sticky Tab bar */}
      <div className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-b border-border/60 sticky top-16 z-40 px-4 md:px-6">
        <div className="max-w-4xl mx-auto py-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList variant="line" className="w-full flex border-none bg-transparent">
              <TabsTrigger value="overview" className="flex-1 py-2 text-xs font-bold uppercase tracking-wider">
                Overview
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex-1 py-2 text-xs font-bold uppercase tracking-wider">
                Projects
              </TabsTrigger>
              <TabsTrigger value="records" className="flex-1 py-2 text-xs font-bold uppercase tracking-wider">
                Records
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main dashboard content container */}
      <main className="max-w-4xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="h-7 w-7 text-primary animate-spin" />
            <p className="text-xs text-text-muted">Analyzing verification logs...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-danger/10 border border-danger/25 text-danger rounded-xl text-center text-xs">
            <p className="font-bold">Failed to load analytics feed</p>
            <p className="mt-1 opacity-80">{error}</p>
            <Button size="sm" variant="outline" className="mt-3 border-danger/30" onClick={refetch}>
              Try Again
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            
            {/* ========================================================================= */}
            {/* OVERVIEW TAB */}
            {/* ========================================================================= */}
            <TabsContent value="overview" className="space-y-6 outline-none">
              
              {/* Row 1 — Stat Cards (2x2 grid) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Total Waste Today */}
                <Card className="border border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]">
                  <CardContent className="p-4">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Waste Collected (Today)</p>
                    <div className="flex items-baseline gap-1 mt-2.5">
                      <span className="text-2xl font-black font-mono text-text-primary tracking-tight">
                        {stats.totalWasteTodayKg.toLocaleString()}
                      </span>
                      <span className="text-xs font-extrabold text-zinc-400">kg</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-primary font-bold mt-2">
                      <TrendingUp className="h-3 w-3" />
                      <span>Clean, non-rejected batches</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Verified Today */}
                <Card className="border border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]">
                  <CardContent className="p-4">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Verified Records (Today)</p>
                    <div className="flex items-baseline gap-0.5 mt-2.5">
                      <span className="text-2xl font-black font-mono text-primary dark:text-emerald-500 tracking-tight">
                        {stats.verifiedCountToday}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 ml-1">runs</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-2 flex items-center gap-0.5">
                      <Sparkles className="h-3 w-3 text-emerald-500 shrink-0 animate-pulse" />
                      <span>Ledger verified automatically</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Pending Review */}
                <Card className={`border transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] ${
                  stats.pendingReviewCount > 0
                    ? 'border-amber-300 bg-amber-50/20 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/10'
                    : 'border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs'
                }`}>
                  <CardContent className="p-4">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${
                      stats.pendingReviewCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'
                    }`}>Pending Review</p>
                    <div className="flex items-baseline mt-2.5">
                      <span className={`text-2xl font-black font-mono tracking-tight ${
                        stats.pendingReviewCount > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-text-primary'
                      }`}>
                        {stats.pendingReviewCount}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-2">Requires auditor validation</p>
                  </CardContent>
                </Card>

                {/* Rejected Records */}
                <Card className={`border transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] ${
                  stats.rejectedCount > 0
                    ? 'border-red-300 bg-red-50/20 shadow-sm dark:border-red-950/20'
                    : 'border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs'
                }`}>
                  <CardContent className="p-4">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${
                      stats.rejectedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'
                    }`}>Rejected Records</p>
                    <div className="flex items-baseline mt-2.5">
                      <span className={`text-2xl font-black font-mono tracking-tight ${
                        stats.rejectedCount > 0 ? 'text-red-600 dark:text-red-500' : 'text-text-primary'
                      }`}>
                        {stats.rejectedCount}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold mt-2">Anomaly engine fraud triggers</p>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2 — Alert Strip */}
              {stats.hasUrgentReview && (
                <div className="bg-amber-50 border border-amber-300 dark:bg-amber-950/10 dark:border-amber-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-bounce shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400">
                        ⚠️ {stats.urgentReviewCount} records need urgent review
                      </h4>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        High risk GPS/photo anomalies require manual oversight.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleReviewNow}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] h-7 px-3 shrink-0 rounded-lg active:scale-95 transition-all"
                  >
                    Review Now
                  </Button>
                </div>
              )}

              {/* Row 3 — Chart: Daily Collection Volume */}
              <Card className="border border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Daily Collection Volume (Last 7 Days)
                  </CardTitle>
                  <CardDescription className="text-[10px] text-text-muted">
                    Shows total validated kilograms (excluding rejected records).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-4">
                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorKg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1B6B3A" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#1B6B3A" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(228, 228, 231, 0.4)" />
                        <XAxis
                          dataKey="dayLabel"
                          tickLine={false}
                          axisLine={false}
                          style={{ fontSize: '10px', fill: '#888', fontWeight: 'bold' }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          style={{ fontSize: '10px', fill: '#888', fontWeight: 'bold' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(27, 107, 58, 0.04)' }} />
                        <Bar dataKey="kg" fill="url(#colorKg)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Row 4 — Recent Activity Feed */}
              <Card className="border border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Recent Activity Feed
                  </CardTitle>
                  <CardDescription className="text-[10px] text-text-muted">
                    Last 10 waste records synced to the ledger.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {stats.recentActivity.length === 0 ? (
                      <div className="p-8 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                        <Inbox className="h-6 w-6 text-zinc-300" />
                        <span>No records registered in the system.</span>
                      </div>
                    ) : (
                      stats.recentActivity.map((rc) => (
                        <Link
                          key={rc.id}
                          href={`/records/${rc.id}`}
                          className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors duration-200 active:bg-muted/80 block"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-primary-light dark:bg-emerald-950/20 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                              <span className="text-xs font-black text-primary dark:text-emerald-400">
                                {rc.quantity}
                              </span>
                              <span className="text-[8px] font-bold text-primary/75 dark:text-emerald-500 uppercase">
                                {rc.unit}
                              </span>
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-text-primary truncate">
                                  {rc.worker_name}
                                </span>
                                <span className="text-[10px] text-text-muted">•</span>
                                <span className="text-[10px] font-semibold text-text-muted truncate">
                                  {rc.site_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                <span className="font-bold text-primary dark:text-emerald-500 font-mono">
                                  {rc.waste_type.replace('_', ' ').toUpperCase()}
                                </span>
                                <span>•</span>
                                <span>{formatTimeAgo(rc.collected_at)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <StatusBadge status={getBadgeStatus(rc.verification_status)} />
                            <ChevronRight className="h-4 w-4 text-zinc-300" />
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

            </TabsContent>

            {/* ========================================================================= */}
            {/* PROJECTS TAB */}
            {/* ========================================================================= */}
            <TabsContent value="projects" className="space-y-4 outline-none relative min-h-[400px]">
              <div className="grid grid-cols-1 gap-4">
                {projects.length === 0 ? (
                  <div className="p-12 text-center text-text-muted text-xs bg-white dark:bg-zinc-900 border border-border/80 rounded-2xl flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-7 w-7 text-zinc-300" />
                    <span>No projects created yet. Click the "+" button below to register a site.</span>
                  </div>
                ) : (
                  projects.map((proj) => (
                    <Card
                      key={proj.id}
                      className="border border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs hover:shadow-md transition-all duration-300"
                    >
                      <CardContent className="p-4 flex justify-between items-start">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-sm text-text-primary truncate">
                              {proj.project_name}
                            </h3>
                            {proj.waste_type && getWasteTypeBadge(proj.waste_type)}
                          </div>
                          
                          <p className="text-[10px] text-text-muted font-semibold flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span>{proj.site_name}</span>
                          </p>

                          <div className="flex items-center gap-4 text-[10px] text-text-muted pt-1">
                            <div>
                              <span>Records: </span>
                              <span className="font-mono font-bold text-text-primary">{proj.record_count ?? 0}</span>
                            </div>
                            {proj.last_activity && (
                              <div>
                                <span>Active: </span>
                                <span className="font-bold text-primary dark:text-emerald-500">
                                  {formatTimeAgo(proj.last_activity)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {proj.address && (
                          <div className="text-[9px] text-right text-zinc-400 font-semibold max-w-[120px] truncate hidden sm:block">
                            {proj.address}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Floating Action Button bottom-right */}
              <Link
                href="/projects/create"
                className="fixed bottom-6 right-6 md:absolute md:bottom-0 md:right-0 bg-primary hover:bg-primary-dark text-white p-3.5 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all z-50 flex items-center justify-center border border-primary/20 cursor-pointer"
                title="Create New Project"
              >
                <Plus className="h-6 w-6 font-bold" />
              </Link>
            </TabsContent>

            {/* ========================================================================= */}
            {/* RECORDS TAB */}
            {/* ========================================================================= */}
            <TabsContent value="records" className="space-y-4 outline-none">
              
              {/* Filter Bar */}
              <Card className="border border-border/80 bg-white/90 dark:bg-zinc-900/90 shadow-sm backdrop-blur-md">
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                      <span>Records Query Filters</span>
                    </span>
                    <button
                      onClick={() => {
                        setFilterProject('all');
                        setFilterStatus('all');
                        setFilterRisk('all');
                        setFilterDateRange('all');
                      }}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      Reset Filters
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    {/* Date Picker Select */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">Time Horizon</span>
                      <Select value={filterDateRange} onValueChange={(val) => setFilterDateRange(val || 'all')}>
                        <SelectTrigger className="h-8.5 text-xs border-border">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today Only</SelectItem>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Project Selector */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">Facility Site</span>
                      <Select value={filterProject} onValueChange={(val) => setFilterProject(val || 'all')}>
                        <SelectTrigger className="h-8.5 text-xs border-border">
                          <SelectValue placeholder="All Projects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.site_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">Verification Status</span>
                      <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val || 'all')}>
                        <SelectTrigger className="h-8.5 text-xs border-border">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending_review">Pending Review</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Risk Filter */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">Anomaly Risk Level</span>
                      <Select value={filterRisk} onValueChange={(val) => setFilterRisk(val || 'all')}>
                        <SelectTrigger className="h-8.5 text-xs border-border">
                          <SelectValue placeholder="All Risk" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Risks</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="high_risk">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Records List/Table */}
              <Card className="border border-border/80 bg-white dark:bg-zinc-900/80 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-border/40 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Collection Registry
                    </CardTitle>
                    <CardDescription className="text-[10px] text-text-muted">
                      Showing {filteredRecords.length} collection records based on filter criteria.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto w-full">
                    {filteredRecords.length === 0 ? (
                      <div className="p-12 text-center text-text-muted text-xs flex flex-col items-center justify-center gap-2">
                        <Inbox className="h-7 w-7 text-zinc-300" />
                        <span>No records match selected query filters.</span>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30 text-text-muted font-bold uppercase text-[9px] tracking-wider select-none">
                            <th className="p-3 pl-4">Date</th>
                            <th className="p-3">Worker</th>
                            <th className="p-3">Site</th>
                            <th className="p-3">Waste Type</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 pr-4 text-center">Risk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {filteredRecords.map((rc) => (
                            <tr
                              key={rc.id}
                              onClick={() => router.push(`/records/${rc.id}`)}
                              className="hover:bg-muted/40 transition-colors duration-150 active:bg-muted/70 cursor-pointer"
                            >
                              <td className="p-3 pl-4 font-mono text-[10px] whitespace-nowrap text-text-primary">
                                {new Date(rc.collected_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="p-3 font-semibold text-text-primary whitespace-nowrap">
                                {rc.worker_name}
                              </td>
                              <td className="p-3 text-text-muted font-semibold truncate max-w-[120px]">
                                {rc.site_name}
                              </td>
                              <td className="p-3">
                                {getWasteTypeBadge(rc.waste_type)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                                {rc.quantity.toLocaleString()} {rc.unit}
                              </td>
                              <td className="p-3 text-center">
                                <StatusBadge status={getBadgeStatus(rc.verification_status)} />
                              </td>
                              <td className="p-3 pr-4 text-center">
                                {getRiskBadge(rc.risk_score)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </CardContent>
              </Card>

            </TabsContent>

          </Tabs>
        )}
      </main>
    </div>
  );
}
