'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CheckCircle, Loader2, ShieldCheck, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CreateProjectPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [projectName, setProjectName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [address, setAddress] = useState('');
  const [wasteType, setWasteType] = useState('mixed');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    setAdmin(parsed);
    setOperatorName(parsed.full_name || 'System Admin');
  }, [router]);

  const getIsMockMode = (): boolean => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !url || url.includes('placeholder-project');
  };

  // Pre-fill dummy GPS coords for easy testing
  const handleAutoFillGps = () => {
    setLatitude('28.6139');
    setLongitude('77.2090');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !siteName) {
      setErrorMsg('Project Name and Site/Facility Name are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const isMock = getIsMockMode();
    const projectData = {
      id: 'proj-' + Date.now(),
      project_name: projectName,
      site_name: siteName,
      address: address || 'No address specified',
      gps_latitude: latitude ? parseFloat(latitude) : 28.6139,
      gps_longitude: longitude ? parseFloat(longitude) : 77.2090,
      waste_type: wasteType,
      operator_name: operatorName || 'Admin User',
      workers_count: 0,
      record_count: 0,
      created_at: new Date().toISOString(),
    };

    try {
      if (isMock) {
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const storedProjects = localStorage.getItem('dmrv-projects') || '[]';
        const projects = JSON.parse(storedProjects);
        localStorage.setItem('dmrv-projects', JSON.stringify([projectData, ...projects]));
      } else {
        // Supabase mode insert
        const { error } = await supabase.from('projects').insert({
          project_name: projectName,
          site_name: siteName,
          address: address || null,
          gps_latitude: latitude ? parseFloat(latitude) : null,
          gps_longitude: longitude ? parseFloat(longitude) : null,
          waste_type: wasteType,
          operator_name: operatorName || null,
          created_by: admin?.id || null,
        });

        if (error) throw new Error(error.message);
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while creating project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-lg z-10 space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        <Card className="border border-border/80 shadow-xl overflow-hidden bg-white/90 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/60 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary text-white p-1.5 rounded-lg border border-primary/20 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Administration</span>
            </div>
            <CardTitle className="text-xl font-bold text-text-primary">Create New Project Site</CardTitle>
            <CardDescription className="text-xs text-text-muted">
              Register a new waste collection site and configure its GPS geofence boundary rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {success ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                <div className="bg-primary/10 p-3 rounded-full text-primary border border-primary/20 animate-bounce">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h3 className="text-base font-bold text-text-primary">Project Registered Successfully</h3>
                <p className="text-xs text-text-muted">Redirecting you back to the operational dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                {errorMsg && (
                  <div className="bg-danger/10 border border-danger/25 text-danger px-3 py-2 rounded-lg text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="projectName" className="text-xs font-bold text-text-muted uppercase">Project/Campaign Name</label>
                  <Input
                    id="projectName"
                    placeholder="e.g. Swachh Bharat Ward 14"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    className="border-border hover:border-zinc-400 focus-visible:ring-primary focus-visible:border-primary text-sm h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="siteName" className="text-xs font-bold text-text-muted uppercase">Site/Facility Center Name</label>
                  <Input
                    id="siteName"
                    placeholder="e.g. Delhi Ward 14 Center"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    required
                    className="border-border hover:border-zinc-400 focus-visible:ring-primary focus-visible:border-primary text-sm h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="address" className="text-xs font-bold text-text-muted uppercase">Physical Address</label>
                  <Input
                    id="address"
                    placeholder="e.g. Ward 14, Delhi NCT, India"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="border-border hover:border-zinc-400 focus-visible:ring-primary focus-visible:border-primary text-sm h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="wasteType" className="text-xs font-bold text-text-muted uppercase">Default Waste Type</label>
                    <Select value={wasteType} onValueChange={(val) => setWasteType(val || 'mixed')}>
                      <SelectTrigger id="wasteType" className="border-border h-10 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="municipal_solid">Municipal Solid</SelectItem>
                        <SelectItem value="organic">Organic</SelectItem>
                        <SelectItem value="plastic">Plastic</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="mixed">Mixed Waste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="operator" className="text-xs font-bold text-text-muted uppercase">Supervising Operator</label>
                    <Input
                      id="operator"
                      placeholder="Operator Name"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="border-border hover:border-zinc-400 focus-visible:ring-primary focus-visible:border-primary text-sm h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-text-muted uppercase flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>Geofence GPS Coordinates</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoFillGps}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      Autofill (New Delhi Center)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted font-medium">GPS Latitude</span>
                      <Input
                        placeholder="e.g. 28.6139"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="border-border text-sm h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-text-muted font-medium">GPS Longitude</span>
                      <Input
                        placeholder="e.g. 77.2090"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="border-border text-sm h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold h-11 text-sm shadow-md mt-6"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Registering Site...</span>
                    </span>
                  ) : (
                    'Register Project Site'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
