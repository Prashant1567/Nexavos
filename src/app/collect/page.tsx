'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useCamera } from '@/hooks/useCamera';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { saveDraft, DraftCollection } from '@/lib/offline-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Camera as CameraIcon, Search, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

const DEFAULT_PROJECTS = [
  {
    id: "proj-1",
    project_name: "Swachh Bharat Ward 14 Collection",
    site_name: "Delhi Ward 14 Center",
    waste_type: "organic",
    address: "Ward 14, Delhi NCT, India"
  },
  {
    id: "proj-2",
    project_name: "Swachh Noida Zone 4 Recyclables",
    site_name: "Noida Recyclables Center",
    waste_type: "plastic",
    address: "Sector 62, Noida, UP, India"
  }
];

export default function CollectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User details
  const [worker, setWorker] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);

  // Search & Project Select (Step 1)
  const [searchText, setSearchText] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Form Details (Step 2)
  const [wasteType, setWasteType] = useState<'municipal_solid' | 'organic' | 'plastic' | 'construction' | 'mixed'>('mixed');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<'kg' | 'ton'>('kg');
  const [notes, setNotes] = useState('');

  // Photos List (Step 3)
  const [photos, setPhotos] = useState<{ base64: string; hash: string }[]>([]);

  // Telemetry (Step 4) & Sync Hooks
  const { lat, lng, accuracy, error: gpsError, refresh: refreshGps } = useGeolocation();
  const { compressing, processFile } = useCamera();
  const { syncState, pendingCount, syncNow } = useOfflineSync();

  // Submission control state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ type: 'online' | 'offline'; id: string } | null>(null);

  // Load worker session & projects
  useEffect(() => {
    const stored = localStorage.getItem('dmrv-user');
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 'field_worker' && parsed.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (parsed.role === 'admin' && (parsed.full_name === 'Anjali Sharma (Admin)' || parsed.full_name === 'Anjali Sharma')) {
      parsed.full_name = 'Prashant';
      localStorage.setItem('dmrv-user', JSON.stringify(parsed));
    }
    setWorker(parsed);

    // Load projects list
    const storedProjects = localStorage.getItem('dmrv-projects');
    if (!storedProjects) {
      localStorage.setItem('dmrv-projects', JSON.stringify(DEFAULT_PROJECTS));
      setProjects(DEFAULT_PROJECTS);
    } else {
      setProjects(JSON.parse(storedProjects));
    }
  }, [router]);

  // Project Selection Handler - pre-fill default waste type
  const handleSelectProject = (proj: any) => {
    setSelectedProject(proj);
    if (proj.waste_type) {
      setWasteType(proj.waste_type);
    }
  };

  // Unit Toggle handler with visual conversion support
  const handleUnitChange = (newUnit: 'kg' | 'ton') => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (quantity > 0) {
      if (newUnit === 'ton') {
        // Convert kg to ton (4 decimals limit)
        setQuantity((q) => parseFloat((q / 1000).toFixed(4)));
      } else {
        // Convert ton to kg (2 decimals limit)
        setQuantity((q) => parseFloat((q * 1000).toFixed(2)));
      }
    }
  };

  // Quantity Stepper adjust (+/- 10kg)
  const handleStepQuantity = (amountKg: number) => {
    if (unit === 'kg') {
      setQuantity((q) => {
        const next = Math.max(0, q + amountKg);
        return parseFloat(next.toFixed(2));
      });
    } else {
      // 10kg is 0.01 ton
      const amountTon = amountKg / 1000;
      setQuantity((q) => {
        const next = Math.max(0, q + amountTon);
        return parseFloat(next.toFixed(3));
      });
    }
  };

  // Camera image input click trigger
  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // File capture processing
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const result = await processFile(files[0]);
        if (result && result.base64) {
          setPhotos((prev) => [...prev, { base64: result.base64, hash: result.hash }]);
        }
      } catch (err) {
        alert('Error processing image: ' + err);
      }
    }
  };

  // Remove photo from list
  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !selectedProject || quantity <= 0 || !lat || !lng || photos.length === 0) return;

    setIsSubmitting(true);

    try {
      const recordId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      // Collect device diagnostic details
      const battery = await (navigator as any).getBattery?.();
      const deviceMeta = {
        batteryLevel: battery?.level || 0.85,
        isCharging: battery?.charging || false,
        networkStatus: navigator.onLine ? ('online' as const) : ('offline' as const),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '390x844',
      };

      const draftRecord: DraftCollection = {
        id: recordId,
        project_id: selectedProject.id,
        worker_id: worker.id,
        waste_type: wasteType,
        quantity,
        unit,
        notes: notes || '',
        evidence: photos.map(p => p.base64),
        photo_hash: photos[0]?.hash || '',
        collected_at: timestamp,
        gps_latitude: lat,
        gps_longitude: lng,
        gps_accuracy: accuracy || 10,
        device_metadata: deviceMeta,
        sync_status: 'pending_sync'
      };

      // 1. Write to IndexedDB first (offline-first design)
      await saveDraft(draftRecord);

      // 2. Trigger synchronization immediately if online
      if (navigator.onLine) {
        await syncNow();
        setSubmissionResult({ type: 'online', id: recordId });
      } else {
        setSubmissionResult({ type: 'offline', id: recordId });
      }
    } catch (err: any) {
      console.error('Submission transaction failed:', err);
      alert('Failed to save record: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to record another entry
  const handleResetForm = () => {
    setSelectedProject(null);
    setSearchText('');
    setWasteType('mixed');
    setQuantity(0);
    setUnit('kg');
    setNotes('');
    setPhotos([]);
    setSubmissionResult(null);
    // Refresh GPS coordinates for next collection
    refreshGps();
  };

  const handleLogout = () => {
    localStorage.removeItem('dmrv-user');
    router.push('/auth/login');
  };

  // Filter projects by name or site_name
  const filteredProjects = projects.filter((proj) => {
    const term = searchText.toLowerCase();
    return (
      proj.project_name.toLowerCase().includes(term) ||
      proj.site_name.toLowerCase().includes(term)
    );
  });

  const isFormValid = selectedProject && quantity > 0 && lat && lng && photos.length > 0;

  // Render Full Screen Confirmation Screen if submitted successfully
  if (submissionResult) {
    const isOnlineSuccess = submissionResult.type === 'online';
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 relative">
        <div className="w-full max-w-[390px] flex flex-col items-center text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-emerald-50 border-4 border-[#1B6B3A] flex items-center justify-center text-[#1B6B3A] shadow-md animate-bounce">
            <Check className="h-11 w-11 stroke-[3.5]" />
          </div>

          <div className="space-y-3">
            <h1 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight">
              {isOnlineSuccess 
                ? '✓ Record Submitted' 
                : '✓ Saved Offline — will sync automatically'}
            </h1>
            <div className="bg-gray-50 border border-border p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Receipt ID Ledger</span>
              <span className="font-mono text-xs font-bold text-text-primary block break-all">{submissionResult.id}</span>
            </div>
          </div>

          <Button
            onClick={handleResetForm}
            className="w-full h-12 text-sm font-bold bg-[#1B6B3A] hover:bg-[#15522c] text-white rounded-xl shadow-xs transition-all"
          >
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white items-center">
      
      {/* Mobile-first sticky header bar */}
      <header className="w-full max-w-[390px] bg-white border-b border-border py-3.5 px-4 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-1.5 select-none">
          <div className="h-7 w-7 rounded-full bg-[#1B6B3A] flex items-center justify-center text-white">
            <Check className="h-4.5 w-4.5 stroke-[3.5]" />
          </div>
          <span className="font-extrabold text-base text-[#1A1A1A]">dMRV</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-muted max-w-[120px] truncate">{worker?.full_name || 'Operator'}</span>
          <div 
            className={`h-2.5 w-2.5 rounded-full shadow-2xs shrink-0 transition-all ${
              syncState === 'offline' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'
            }`}
            title={syncState === 'offline' ? 'Offline cached sync mode' : 'Central ledger online'}
          />
          <button onClick={handleLogout} className="text-[10px] font-bold text-red-600 active:underline hover:text-red-700">
            Exit
          </button>
        </div>
      </header>

      {/* Main scrolling viewport container - locked at 390px mobile boundary */}
      <main className="w-full max-w-[390px] p-4 flex-1 space-y-5 pb-8">
        
        {/* Step 1: Select Project Card List */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Step 1 — Select Project
            </h2>
            {selectedProject && (
              <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                Selected ✓
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-text-muted">
              Which site are you at?
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search sites or projects..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-11 pl-9 pr-3 py-2 bg-gray-50 border border-border rounded-xl text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-[#1B6B3A] focus:border-[#1B6B3A] shadow-3xs"
              />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-text-muted" />
            </div>
          </div>

          {/* Project card list */}
          <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
            {filteredProjects.length === 0 ? (
              <p className="text-[11px] text-text-muted italic py-3 text-center">No projects match search query.</p>
            ) : (
              filteredProjects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'border-[#1B6B3A] bg-emerald-50/50'
                        : 'border-border bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-extrabold text-xs text-text-primary leading-tight">
                        {proj.site_name}
                      </span>
                      <span className="bg-primary/10 text-primary text-[8px] font-bold px-1.5 py-0.2 rounded border border-primary/10 uppercase tracking-wide shrink-0">
                        {proj.waste_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted mt-1 leading-snug">{proj.address}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Step 2, 3, 4: Render form only after project is chosen */}
        {selectedProject ? (
          <form onSubmit={handleFormSubmit} className="space-y-5 pt-3 border-t border-border/60 animate-in fade-in duration-300">
            
            {/* Step 2: Enter Details */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Step 2 — Collection Details
              </h2>

              {/* Waste type horizontal pill selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Waste Type
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 select-none pr-1">
                  {[
                    { id: 'municipal_solid', label: 'Municipal' },
                    { id: 'organic', label: 'Organic' },
                    { id: 'plastic', label: 'Plastic' },
                    { id: 'construction', label: 'Construction' },
                    { id: 'mixed', label: 'Mixed' }
                  ].map((item) => {
                    const active = wasteType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setWasteType(item.id as any)}
                        className={`h-8 px-3 rounded-full text-[10px] font-extrabold uppercase border whitespace-nowrap transition-all ${
                          active
                            ? 'bg-[#1B6B3A] text-white border-[#1B6B3A] shadow-3xs'
                            : 'bg-white text-text-muted border-border hover:bg-gray-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity steppers and unit toggles */}
              <div className="grid grid-cols-1 gap-4 bg-gray-50/50 p-3 rounded-xl border border-border/40">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block text-center">
                    Quantity Collected
                  </label>
                  
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(-10)}
                      className="h-12 w-12 rounded-xl bg-gray-100 active:bg-gray-200 flex items-center justify-center font-bold text-lg text-text-primary select-none shrink-0 border border-border"
                    >
                      -
                    </button>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={quantity === 0 ? '' : quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setQuantity(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        placeholder="0.00"
                        className="w-full h-12 text-center text-lg font-extrabold font-mono border border-border rounded-xl focus:ring-2 focus:ring-[#1B6B3A] focus:border-[#1B6B3A] shadow-3xs bg-white text-text-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(10)}
                      className="h-12 w-12 rounded-xl bg-gray-100 active:bg-gray-200 flex items-center justify-center font-bold text-lg text-[#1A1A1A] select-none shrink-0 border border-border"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Unit Switch Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUnitChange('kg')}
                    className={`h-10 font-extrabold text-xs rounded-xl border transition-all ${
                      unit === 'kg'
                        ? 'bg-[#1B6B3A] text-white border-[#1B6B3A] shadow-3xs'
                        : 'bg-white text-text-muted border-border hover:bg-gray-50'
                    }`}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitChange('ton')}
                    className={`h-10 font-extrabold text-xs rounded-xl border transition-all ${
                      unit === 'ton'
                        ? 'bg-[#1B6B3A] text-white border-[#1B6B3A] shadow-3xs'
                        : 'bg-white text-text-muted border-border hover:bg-gray-50'
                    }`}
                  >
                    TON
                  </button>
                </div>
              </div>

              {/* Optional Field Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Any issues? (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. wet waste, access restricted"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-11 text-xs rounded-xl border-border shadow-3xs"
                />
              </div>
            </section>

            {/* Step 3: Capture Evidence */}
            <section className="space-y-3.5 pt-1">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Step 3 — Capture Evidence
                </h2>
                <span className="text-[10px] text-text-muted font-bold">
                  {photos.length} / 3 Photos
                </span>
              </div>

              {/* Photos Thumbnails list */}
              {photos.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {photos.map((ph, idx) => (
                    <div key={idx} className="relative h-16 w-16 rounded-xl overflow-hidden border border-border shadow-3xs bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.base64} alt="" loading="lazy" className="h-full w-full object-cover" />
                      <div className="absolute top-0.5 right-0.5 h-4 w-4 bg-green-500 rounded-full flex items-center justify-center text-white border border-white shadow-3xs">
                        <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute bottom-0 inset-x-0 bg-black/75 hover:bg-black/90 text-white text-[8px] font-bold py-0.5 text-center transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Take photo hidden inputs */}
              {photos.length < 3 && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    onClick={triggerCamera}
                    className="w-full h-12 text-xs font-extrabold bg-[#1B6B3A] hover:bg-[#15522c] text-white rounded-xl gap-2 shadow-xs transition-all"
                    disabled={compressing}
                  >
                    <CameraIcon className="h-4.5 w-4.5" />
                    <span>{compressing ? 'Processing Photo...' : '📷 Take Photo'}</span>
                  </Button>
                </div>
              )}

              {photos.length > 0 && photos.length < 3 && (
                <button
                  type="button"
                  onClick={triggerCamera}
                  className="text-[11px] font-extrabold text-[#1B6B3A] active:underline block mt-1 transition-all"
                >
                  + Add another photo
                </button>
              )}
            </section>

            {/* Step 4: Auto-Capture Telemetry */}
            <section className="space-y-1.5 bg-gray-50/50 p-3 rounded-xl border border-border/40">
              <h2 className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
                Step 4 — Auto-Capture
              </h2>
              
              {/* Dynamic location and timestamp status */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold select-none leading-none min-h-5">
                  {lat && lng ? (
                    <span className="text-green-700 flex items-center gap-1">
                      📍 Location captured
                    </span>
                  ) : (
                    <span className="text-amber-600 animate-pulse flex items-center gap-1">
                      📍 Waiting for GPS...
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-text-muted font-mono leading-none">
                  {lat && lng 
                    ? `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.round(accuracy || 0)}m)` 
                    : gpsError ? `GPS Error: ${gpsError}` : 'Reading satellite sensors...'}
                </div>
              </div>
            </section>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 text-sm font-extrabold bg-[#1B6B3A] hover:bg-[#15522c] text-white rounded-xl shadow-md gap-2"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Record</span>
                )}
              </Button>

              {/* Inline warning guides */}
              {!isFormValid && (
                <p className="text-[9px] text-center text-text-muted font-bold uppercase tracking-wider mt-2.5">
                  Needs: {!selectedProject ? 'Project, ' : ''}{quantity <= 0 ? 'Quantity, ' : ''}{!lat ? 'GPS, ' : ''}{photos.length === 0 ? 'Evidence Photo' : ''}
                </p>
              )}
            </div>

          </form>
        ) : (
          /* Placeholder hint if project not selected */
          <div className="bg-gray-50 border border-border/60 rounded-xl p-8 text-center text-text-muted space-y-1 animate-in fade-in duration-300">
            <ArrowRight className="h-6 w-6 mx-auto stroke-[2.5] text-primary/70 animate-pulse" />
            <p className="font-bold text-[11px] text-[#1A1A1A]">Select a Site to Continue</p>
            <p className="text-[10px] leading-snug">Choose the municipal contract ward site in Step 1 above to reveal the collection form details.</p>
          </div>
        )}

      </main>
    </div>
  );
}
