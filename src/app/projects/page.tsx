'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Settings,
  Plus,
  FolderOpen,
  MapPin,
  Users,
  TrendingUp,
  LogOut,
} from 'lucide-react';

const INITIAL_PROJECTS = [
  {
    id: "proj-1",
    name: "Swachh Bharat Ward 14 Collection",
    facility: "Delhi Ward 14 Center",
    workers_count: 6,
    verification_rate: 98.4,
    status: "active"
  },
  {
    id: "proj-2",
    name: "Swachh Noida Zone 4 Recyclables",
    facility: "Noida Recyclables Center",
    workers_count: 4,
    verification_rate: 96.2,
    status: "active"
  }
];

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [success, setSuccess] = useState(false);

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

    const localProjects = localStorage.getItem('dmrv-projects');
    if (!localProjects) {
      localStorage.setItem('dmrv-projects', JSON.stringify(INITIAL_PROJECTS));
      setProjects(INITIAL_PROJECTS);
    } else {
      setProjects(JSON.parse(localProjects));
    }
  }, [router]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !facilityName) return;

    const newProject = {
      id: 'proj-' + Date.now(),
      name: projectName,
      facility: facilityName,
      workers_count: 0,
      verification_rate: 100.0,
      status: 'active'
    };

    const updated = [newProject, ...projects];
    setProjects(updated);
    localStorage.setItem('dmrv-projects', JSON.stringify(updated));

    setProjectName('');
    setFacilityName('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('dmrv-user');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-border py-4 px-6 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-xl border border-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">Projects Manager</h1>
              <p className="text-[10px] text-text-muted">Manage active waste collection ward contracts</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-primary-light border border-primary/20 text-primary font-bold px-2 py-0.5 rounded">
              Role: Admin
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-danger">
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs text-text-muted uppercase tracking-wider">Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-muted rounded-lg transition-colors">
                <ClipboardList className="h-4.5 w-4.5 text-text-muted" />
                <span>Overview</span>
              </Link>
              <Link href="/review" className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-muted rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-accent" />
                  <span>Review Queue</span>
                </div>
              </Link>
              <Link href="/reports" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-muted rounded-lg transition-colors">
                <FileSpreadsheet className="h-4.5 w-4.5 text-primary" />
                <span>Compliance Reports</span>
              </Link>
              <Link href="/projects" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-primary bg-primary-light rounded-lg border border-primary/10">
                <Layers className="h-4.5 w-4.5" />
                <span>Projects</span>
              </Link>
              <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-muted rounded-lg transition-colors">
                <Settings className="h-4.5 w-4.5" />
                <span>Operator Settings</span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Primary Projects Workspace */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Project List */}
            <div className="md:col-span-2 space-y-4">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Active Municipal Projects</h2>
              <div className="space-y-4">
                {projects.map((proj) => (
                  <Card key={proj.id} className="border border-border/80 shadow-xs hover:border-primary/40 transition-colors">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold text-text-primary">{proj.name}</CardTitle>
                        <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded border border-primary/10 uppercase">
                          {proj.status}
                        </span>
                      </div>
                      <CardDescription className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>Facility Center: {proj.facility}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 border-t border-border/40 bg-surface/30">
                      <div className="flex gap-4 text-xs font-semibold text-text-muted">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span>{proj.workers_count} Active Workers</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                          <span>{proj.verification_rate}% Verifiable Success</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Create Project Card Form */}
            <div className="md:col-span-1">
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    <Plus className="h-4.5 w-4.5 text-primary" />
                    <span>Create New Ward Project</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {success && (
                    <div className="mb-3 p-2 bg-primary text-white text-[10px] font-bold rounded-lg">
                      Project zone created successfully!
                    </div>
                  )}

                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Project/Ward Name</label>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. SBM Sector 15 Zone"
                        className="h-10 border-border text-xs rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Assigned Facility Name</label>
                      <Input
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="e.g. Sector 15 Center"
                        className="h-10 border-border text-xs rounded-lg"
                      />
                    </div>

                    <Button type="submit" className="w-full h-10 text-xs font-bold bg-primary hover:bg-primary/95 text-white gap-1 rounded-lg">
                      <FolderOpen className="h-4 w-4" />
                      <span>Create Project</span>
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
