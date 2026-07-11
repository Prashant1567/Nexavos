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
  MapPin,
  Save,
  CheckCircle,
  LogOut,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  
  // Geofence configuration states
  const [facilityName, setFacilityName] = useState('Delhi Ward 14 Audit Center');
  const [centerLat, setCenterLat] = useState(28.6139);
  const [centerLng, setCenterLng] = useState(77.2090);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  
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
    setAdmin(parsed);

    // Load custom settings if any exist
    const savedName = localStorage.getItem('dmrv-fac-name') || 'Delhi Ward 14 Audit Center';
    const savedLat = localStorage.getItem('dmrv-fac-lat') || '28.6139';
    const savedLng = localStorage.getItem('dmrv-fac-lng') || '77.2090';
    const savedRadius = localStorage.getItem('dmrv-fac-radius') || '5000';

    setFacilityName(savedName);
    setCenterLat(parseFloat(savedLat));
    setCenterLng(parseFloat(savedLng));
    setRadiusMeters(parseInt(savedRadius));
  }, [router]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save to local config storage
    localStorage.setItem('dmrv-fac-name', facilityName);
    localStorage.setItem('dmrv-fac-lat', centerLat.toString());
    localStorage.setItem('dmrv-fac-lng', centerLng.toString());
    localStorage.setItem('dmrv-fac-radius', radiusMeters.toString());

    // Update session info to align geofence coordinates dynamically
    if (admin) {
      const updatedUser = {
        ...admin,
        facility_name: facilityName,
        facility_lat: centerLat,
        facility_lng: centerLng,
        facility_radius: radiusMeters,
      };
      localStorage.setItem('dmrv-user', JSON.stringify(updatedUser));
    }

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
              <h1 className="text-lg font-bold text-text-primary">Settings Config</h1>
              <p className="text-[10px] text-text-muted">Configure operational geofencing boundaries</p>
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
              <Link href="/projects" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-text-muted hover:text-text-primary hover:bg-muted rounded-lg transition-colors">
                <Layers className="h-4.5 w-4.5" />
                <span>Projects</span>
              </Link>
              <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-primary bg-primary-light rounded-lg border border-primary/10">
                <Settings className="h-4.5 w-4.5" />
                <span>Operator Settings</span>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Primary Settings form */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-sm font-bold text-text-primary">Geofence Boundary Configuration</CardTitle>
              <CardDescription className="text-[10px] text-text-muted">
                Define the spatial coordinates and verification radius for your ward collections. Records matching outside these settings trigger geofence warnings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {success && (
                <div className="mb-4 p-3 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs">
                  <CheckCircle className="h-4.5 w-4.5" />
                  <span>Geofence parameters saved successfully!</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Facility Name */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Facility/Ward Name</label>
                  <Input
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    className="h-10 border-border text-xs rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Coordinate Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Center Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={centerLat}
                      onChange={(e) => setCenterLat(parseFloat(e.target.value))}
                      className="h-10 border-border text-xs font-mono rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Center Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={centerLng}
                      onChange={(e) => setCenterLng(parseFloat(e.target.value))}
                      className="h-10 border-border text-xs font-mono rounded-lg focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Geofence target radius */}
                <div className="space-y-1.5 text-xs">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Allowed Verification Radius (Meters)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(parseInt(e.target.value))}
                      className="h-10 border-border text-xs font-mono rounded-lg focus:ring-1 focus:ring-primary focus:border-primary pr-12"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-text-muted text-[10px] font-bold uppercase">
                      meters
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 bg-muted rounded-lg border border-border/60 text-[10px] text-text-muted leading-relaxed flex gap-2">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-text-primary block mb-0.5">Spatial Audit Verification</span>
                    When field workers upload waste proofs, their phone GPS coordinates are mathematically compared (using Haversine equations) against these coordinates. Submissions exceeding {radiusMeters} meters are automatically flagged as anomalies.
                  </div>
                </div>

                <Button type="submit" className="h-10 text-xs font-bold bg-primary hover:bg-primary/95 text-white gap-1 px-5 rounded-lg">
                  <Save className="h-4 w-4" />
                  <span>Save Parameters</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
