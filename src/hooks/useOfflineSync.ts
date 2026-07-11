import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getDrafts, deleteDraft, DraftCollection, getDraftCount } from '@/lib/offline-store';
import { evaluateAnomalies, CollectionRecord, AnomalyContext } from '@/lib/anomaly-engine';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);

  // Update count of pending offline records
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getDraftCount();
      setPendingCount(count);
    } catch (e) {
      console.error('Failed to read draft count:', e);
    }
  }, []);

  // Helper to convert base64 image data to a binary Blob for upload
  const base64ToBlob = async (base64Data: string): Promise<Blob> => {
    const res = await fetch(base64Data);
    return res.blob();
  };

  // Build anomaly context from localStorage mock collections
  const buildAnomalyContext = (draft: DraftCollection): AnomalyContext => {
    // Load project GPS from localStorage (mock projects store)
    let projectGps: AnomalyContext['projectGps'] = null;
    try {
      const projectsStr = localStorage.getItem('dmrv-projects');
      if (projectsStr) {
        const projects = JSON.parse(projectsStr);
        const matched = projects.find((p: any) => p.id === draft.project_id);
        if (matched && matched.gps_latitude && matched.gps_longitude) {
          projectGps = { lat: matched.gps_latitude, lng: matched.gps_longitude };
        }
      }
    } catch { /* ignore */ }

    // Fallback to default facility coordinates if no project GPS
    if (!projectGps) {
      const facLat = localStorage.getItem('dmrv-fac-lat');
      const facLng = localStorage.getItem('dmrv-fac-lng');
      if (facLat && facLng) {
        projectGps = { lat: parseFloat(facLat), lng: parseFloat(facLng) };
      } else {
        // Default mock facility: Delhi Ward 14
        projectGps = { lat: 28.6139, lng: 77.2090 };
      }
    }

    // Load recent records for duplicate / rapid succession checks
    let recentRecords: AnomalyContext['recentRecords'] = [];
    try {
      const collectionsStr = localStorage.getItem('dmrv-collections');
      if (collectionsStr) {
        const all = JSON.parse(collectionsStr);
        recentRecords = all.map((r: any) => ({
          id: r.id,
          project_id: r.project_id,
          worker_id: r.worker_id,
          waste_type: r.waste_type,
          collected_at: r.collected_at,
        }));
      }
    } catch { /* ignore */ }

    return { projectGps, recentRecords };
  };

  // Convert a DraftCollection to a CollectionRecord for the engine
  const draftToRecord = (draft: DraftCollection): CollectionRecord => ({
    id: draft.id,
    project_id: draft.project_id,
    worker_id: draft.worker_id,
    waste_type: draft.waste_type,
    quantity: draft.quantity,
    unit: draft.unit,
    evidence: draft.evidence,
    gps_latitude: draft.gps_latitude,
    gps_longitude: draft.gps_longitude,
    gps_accuracy: draft.gps_accuracy,
    collected_at: draft.collected_at,
  });

  // Run the synchronization process
  const syncNow = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (!navigator.onLine) {
      setSyncState('offline');
      await updatePendingCount();
      return;
    }

    try {
      const drafts = await getDrafts();
      if (drafts.length === 0) {
        setSyncState('synced');
        setPendingCount(0);
        setErrorMessage(null);
        return;
      }

      setSyncState('syncing');
      setErrorMessage(null);
      let syncedInRun = 0;

      for (const draft of drafts) {
        try {
          // Check if running in mock/demo mode (placeholder credentials)
          const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder-project');

          // Run the anomaly verification engine
          const context = buildAnomalyContext(draft);
          const record = draftToRecord(draft);
          const result = evaluateAnomalies(record, context);

          if (isMockMode) {
            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 600));

            // Load existing records from localStorage
            const existingStr = localStorage.getItem('dmrv-collections') || '[]';
            const existing = JSON.parse(existingStr);

            const syncedRecord = {
              ...draft,
              image_url: draft.evidence[0] || '',
              photo_url: draft.evidence[0] || '',
              verification_status: result.verification_status,
              risk_score: result.risk_score,
              sync_status: 'synced',
              submitted_at: new Date().toISOString(),
              anomalies: result.anomalies,
              evidence_urls: draft.evidence,
              worker_name: (() => {
                try {
                  const u = localStorage.getItem('dmrv-user');
                  return u ? JSON.parse(u).full_name : 'Field Worker';
                } catch { return 'Field Worker'; }
              })(),
            };

            localStorage.setItem('dmrv-collections', JSON.stringify([syncedRecord, ...existing]));
          } else {
            // Upload ALL photos in draft.evidence
            const photoUrls: string[] = [];
            for (const imgBase64 of draft.evidence) {
              const blob = await base64ToBlob(imgBase64);
              const fileExt = 'jpg';
              const filePath = `records/${draft.id}/${crypto.randomUUID()}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from('evidence-photos')
                .upload(filePath, blob, {
                  contentType: 'image/jpeg',
                  upsert: true,
                });

              if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

              const { data: urlData } = supabase.storage
                .from('evidence-photos')
                .getPublicUrl(filePath);

              photoUrls.push(urlData.publicUrl);
            }

            // Insert record into public.collection_records using engine-derived status
            const { error: dbError } = await supabase.from('collection_records').insert({
              id: draft.id,
              project_id: draft.project_id,
              worker_id: draft.worker_id,
              waste_type: draft.waste_type,
              quantity: draft.quantity,
              unit: draft.unit,
              notes: draft.notes || '',
              gps_latitude: draft.gps_latitude,
              gps_longitude: draft.gps_longitude,
              collected_at: draft.collected_at,
              verification_status: result.verification_status,
              risk_score: result.risk_score,
              sync_status: 'synced',
            });

            if (dbError) {
              if (dbError.code === '23505') {
                console.log('Record already synced, deleting local copy...');
              } else {
                throw new Error(`Database insert failed: ${dbError.message}`);
              }
            }

            // Insert evidence image records
            for (const photoUrl of photoUrls) {
              const { error: evidenceError } = await supabase.from('evidence').insert({
                record_id: draft.id,
                image_url: photoUrl
              });
              if (evidenceError) {
                console.error('Evidence record insertion failed:', evidenceError.message);
              }
            }

            // Insert anomaly records
            for (const anomaly of result.anomalies) {
              const { error: anomError } = await supabase.from('anomalies').insert({
                id: anomaly.id,
                record_id: anomaly.record_id,
                anomaly_type: anomaly.anomaly_type,
                severity: anomaly.severity,
                status: anomaly.status,
              });
              if (anomError) {
                console.error('Anomaly record insertion failed:', anomError.message);
              }
            }
          }

          // 5. Delete successfully synced draft from IndexedDB
          await deleteDraft(draft.id);
          syncedInRun++;
        } catch (itemError: any) {
          console.error(`Failed to sync item ${draft.id}:`, itemError);
          setErrorMessage(`Sync failed on record: ${itemError.message || itemError}`);
          setSyncState('error');
          await updatePendingCount();
          return;
        }
      }

      setSyncState('synced');
      setErrorMessage(null);
      setLastSyncedCount(syncedInRun);
      await updatePendingCount();
    } catch (err: any) {
      console.error('General sync error:', err);
      setSyncState('error');
      setErrorMessage(err.message || 'An error occurred during synchronization');
      await updatePendingCount();
    }
  }, [updatePendingCount]);

  // Handle connection events and initial sync triggers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    updatePendingCount();

    const handleOnline = () => {
      syncNow();
    };

    const handleOffline = () => {
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      syncNow();
    } else {
      setSyncState('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow, updatePendingCount]);

  return {
    syncState,
    pendingCount,
    errorMessage,
    lastSyncedCount,
    syncNow,
    refreshPendingCount: updatePendingCount,
  };
}
