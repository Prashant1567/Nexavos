'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface Anomaly {
  id: string;
  anomaly_type: string;
  severity: 'warning' | 'high_risk';
  status: 'open' | 'resolved' | 'dismissed';
}

export interface CollectionRecord {
  id: string;
  project_id: string;
  worker_id: string;
  waste_type: string;
  quantity: number;
  unit: 'kg' | 'ton';
  notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  collected_at: string;
  submitted_at?: string;
  verification_status: 'verified' | 'pending_review' | 'rejected';
  risk_score: 'normal' | 'warning' | 'high_risk';
  sync_status: 'draft' | 'pending_sync' | 'synced';
  // Joined fields
  worker_name?: string;
  site_name?: string;
  project_name?: string;
  anomalies?: Anomaly[];
}

export interface Project {
  id: string;
  project_name: string;
  site_name: string;
  address?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  waste_type?: string;
  operator_name?: string;
  workers_count?: number;
  record_count?: number;
  last_activity?: string;
}

export interface DashboardStats {
  totalWasteTodayKg: number;
  verifiedCountToday: number;
  pendingReviewCount: number;
  rejectedCount: number;
  hasUrgentReview: boolean;
  urgentReviewCount: number;
  chartData: { dayLabel: string; kg: number }[];
  recentActivity: CollectionRecord[];
}

const INITIAL_PROJECTS = [
  {
    id: "proj-1",
    project_name: "Swachh Bharat Ward 14 Collection",
    site_name: "Delhi Ward 14 Center",
    waste_type: "organic",
    address: "Ward 14, Delhi NCT, India",
    workers_count: 6,
  },
  {
    id: "proj-2",
    project_name: "Swachh Noida Zone 4 Recyclables",
    site_name: "Noida Recyclables Center",
    waste_type: "plastic",
    address: "Sector 62, Noida, UP, India",
    workers_count: 4,
  }
];

export function useDashboardData() {
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalWasteTodayKg: 0,
    verifiedCountToday: 0,
    pendingReviewCount: 0,
    rejectedCount: 0,
    hasUrgentReview: false,
    urgentReviewCount: 0,
    chartData: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const lastMockDataRef = useRef<{ proj: string | null; coll: string | null }>({ proj: null, coll: null });
  const isFirstRun = useRef(true);

  // Check if running in mock mode
  const getIsMockMode = (): boolean => {
    if (typeof window === 'undefined') return true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !url || url.includes('placeholder-project');
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const isMock = getIsMockMode();
      
      if (isMock) {
        // --- MOCK MODE (localStorage) ---
        const storedProj = localStorage.getItem('dmrv-projects');
        const storedColl = localStorage.getItem('dmrv-collections');

        if (
          !isFirstRun.current &&
          lastMockDataRef.current.proj === storedProj &&
          lastMockDataRef.current.coll === storedColl
        ) {
          setLoading(false);
          return;
        }

        isFirstRun.current = false;
        lastMockDataRef.current = { proj: storedProj, coll: storedColl };

        // Fetch projects
        let localProjects: Project[] = [];
        if (!storedProj) {
          localStorage.setItem('dmrv-projects', JSON.stringify(INITIAL_PROJECTS));
          localProjects = INITIAL_PROJECTS as Project[];
        } else {
          localProjects = JSON.parse(storedProj);
        }

        // Fetch collections
        let localCollections: any[] = [];
        if (storedColl) {
          localCollections = JSON.parse(storedColl);
        }

        // Map mock collections with projects info
        const mappedRecords: CollectionRecord[] = localCollections.map((rc: any) => {
          const matchedProj = localProjects.find((p) => p.id === rc.project_id);
          return {
            ...rc,
            worker_name: rc.worker_name || 'Field Worker',
            project_name: matchedProj?.project_name || 'Unknown Project',
            site_name: matchedProj?.site_name || 'Unknown Site',
            // convert dates to string
            collected_at: rc.collected_at || rc.captured_at || new Date().toISOString(),
          };
        });

        // Map project metadata (record counts & last activity)
        const updatedProjects = localProjects.map((proj) => {
          const projRecords = mappedRecords.filter((r) => r.project_id === proj.id);
          const sorted = [...projRecords].sort(
            (a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
          );
          return {
            ...proj,
            record_count: projRecords.length,
            last_activity: sorted.length > 0 ? sorted[0].collected_at : undefined,
          };
        });

        setRecords(mappedRecords);
        setProjects(updatedProjects);
        aggregateStats(mappedRecords);
        setError(null);
      } else {
        // --- SUPABASE MODE ---
        // Fetch projects
        const { data: dbProjects, error: projErr } = await supabase
          .from('projects')
          .select('*');

        if (projErr) throw new Error(projErr.message);

        // Fetch collections with joins
        const { data: dbRecords, error: recErr } = await supabase
          .from('collection_records')
          .select(`
            *,
            projects (
              project_name,
              site_name,
              waste_type
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

        // Format collections for uniform usage
        const formattedRecords: CollectionRecord[] = (dbRecords || []).map((rc: any) => ({
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

        // Format projects list
        const formattedProjects: Project[] = (dbProjects || []).map((proj: any) => {
          const projRecords = formattedRecords.filter((r) => r.project_id === proj.id);
          const sorted = [...projRecords].sort(
            (a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
          );
          return {
            id: proj.id,
            project_name: proj.project_name,
            site_name: proj.site_name,
            address: proj.address,
            gps_latitude: proj.gps_latitude ? Number(proj.gps_latitude) : undefined,
            gps_longitude: proj.gps_longitude ? Number(proj.gps_longitude) : undefined,
            waste_type: proj.waste_type,
            operator_name: proj.operator_name,
            record_count: projRecords.length,
            last_activity: sorted.length > 0 ? sorted[0].collected_at : undefined,
          };
        });

        setRecords(formattedRecords);
        setProjects(formattedProjects);
        aggregateStats(formattedRecords);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const aggregateStats = (allRecords: CollectionRecord[]) => {
    const today = new Date();
    const todayStr = today.toDateString();

    const isRecordToday = (dateStr: string) => {
      try {
        return new Date(dateStr).toDateString() === todayStr;
      } catch {
        return false;
      }
    };

    // 1. Total waste collected today (kg) - only count non-rejected
    const todayRecords = allRecords.filter((r) => isRecordToday(r.collected_at));
    const totalWasteTodayKg = todayRecords
      .filter((r) => r.verification_status !== 'rejected')
      .reduce((sum, r) => {
        const qty = Number(r.quantity) || 0;
        const weight = r.unit === 'ton' ? qty * 1000 : qty;
        return sum + weight;
      }, 0);

    // 2. Verified today
    const verifiedCountToday = todayRecords.filter(
      (r) => r.verification_status === 'verified'
    ).length;

    // 3. Pending review (system total)
    const pendingReviewCount = allRecords.filter(
      (r) => r.verification_status === 'pending_review'
    ).length;

    // 4. Rejected (system total)
    const rejectedCount = allRecords.filter(
      (r) => r.verification_status === 'rejected'
    ).length;

    // 5. Urgent review banner (pending review + high risk)
    const urgentRecords = allRecords.filter(
      (r) => r.verification_status === 'pending_review' && r.risk_score === 'high_risk'
    );
    const hasUrgentReview = urgentRecords.length > 0;
    const urgentReviewCount = urgentRecords.length;

    // 6. Chart data: last 7 days daily collection volume (kg)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toDateString();
      
      const dayRecords = allRecords.filter(
        (r) => r.verification_status !== 'rejected' && new Date(r.collected_at).toDateString() === dStr
      );

      const dayWeight = dayRecords.reduce((sum, r) => {
        const qty = Number(r.quantity) || 0;
        const weight = r.unit === 'ton' ? qty * 1000 : qty;
        return sum + weight;
      }, 0);

      // Label as "May 29" or "29 May"
      const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      chartData.push({
        dayLabel,
        kg: Math.round(dayWeight * 10) / 10,
      });
    }

    // 7. Recent activity: last 10 records
    const recentActivity = [...allRecords]
      .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime())
      .slice(0, 10);

    setStats({
      totalWasteTodayKg: Math.round(totalWasteTodayKg * 10) / 10,
      verifiedCountToday,
      pendingReviewCount,
      rejectedCount,
      hasUrgentReview,
      urgentReviewCount,
      chartData,
      recentActivity,
    });
  };

  useEffect(() => {
    fetchDashboardData();

    const isMock = getIsMockMode();
    let subscriptionChannel: any = null;
    let pollInterval: any = null;

    if (!isMock) {
      // Subscribe to Supabase real-time changes
      subscriptionChannel = supabase
        .channel('dashboard-records-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'collection_records' },
          () => {
            console.log('Real-time collection record change detected, updating dashboard...');
            fetchDashboardData();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsRealtime(true);
          }
        });
    } else {
      // Mock Mode real-time simulation
      setIsRealtime(true);

      // Listen for local storage changes across tabs
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'dmrv-collections' || e.key === 'dmrv-projects') {
          fetchDashboardData();
        }
      };
      window.addEventListener('storage', handleStorageChange);

      // Poll local data every 3 seconds for instant updates within the same window (e.g. sync activity)
      pollInterval = setInterval(() => {
        fetchDashboardData();
      }, 3000);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        if (pollInterval) clearInterval(pollInterval);
      };
    }

    return () => {
      if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel);
      }
    };
  }, [fetchDashboardData]);

  return {
    records,
    projects,
    stats,
    loading,
    error,
    isRealtime,
    refetch: fetchDashboardData,
  };
}
