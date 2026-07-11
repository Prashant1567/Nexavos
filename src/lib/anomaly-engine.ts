import {
  MAX_QUANTITY_KG,
  DUPLICATE_WINDOW_MS,
  MAX_SITE_DISTANCE_METERS,
  RAPID_SUBMISSION_MAX_RECORDS,
  RAPID_SUBMISSION_WINDOW_MS,
} from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnomalyType =
  | 'missing_gps'
  | 'missing_photo'
  | 'high_quantity'
  | 'duplicate_submission'
  | 'location_outside_site'
  | 'rapid_succession';

export interface AnomalyFlag {
  id: string;
  record_id: string;
  anomaly_type: AnomalyType;
  severity: 'warning' | 'high_risk';
  status: 'open' | 'resolved' | 'dismissed';
  details: string;
}

export type VerificationStatus = 'verified' | 'pending_review' | 'rejected';
export type RiskScore = 'normal' | 'warning' | 'high_risk';

export interface VerificationResult {
  verification_status: VerificationStatus;
  risk_score: RiskScore;
  anomalies: AnomalyFlag[];
}

/**
 * Represents the submitted collection record to be evaluated.
 */
export interface CollectionRecord {
  id: string;
  project_id: string;
  worker_id: string;
  waste_type: string;
  quantity: number;
  unit: 'kg' | 'ton';
  evidence: string[];
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number;
  collected_at: string;
}

/**
 * Context data required for contextual anomaly checks (duplicates, rapid succession, site GPS).
 */
export interface AnomalyContext {
  /** GPS coordinates of the assigned project site. Null if unknown. */
  projectGps: { lat: number; lng: number } | null;
  /** Recent records from any worker, used for duplicate and rapid succession checks. */
  recentRecords: Array<{
    id: string;
    project_id: string;
    worker_id: string;
    waste_type: string;
    collected_at: string;
  }>;
}

/**
 * Individual anomaly rule definition.
 */
interface AnomalyRule {
  type: AnomalyType;
  severity: 'warning' | 'high_risk';
  check: (record: CollectionRecord, context: AnomalyContext) => boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Haversine Distance (meters)
// ---------------------------------------------------------------------------

/**
 * Calculates Haversine distance in meters between two GPS coordinates.
 */
export function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Anomaly Rules (all 6)
// ---------------------------------------------------------------------------

const ANOMALY_RULES: AnomalyRule[] = [
  // Rule 1 — Missing GPS
  {
    type: 'missing_gps',
    severity: 'high_risk',
    check: (record) =>
      record.gps_latitude === null ||
      record.gps_latitude === undefined ||
      record.gps_longitude === null ||
      record.gps_longitude === undefined,
    message: 'GPS location not captured',
  },

  // Rule 2 — Missing Photo
  {
    type: 'missing_photo',
    severity: 'high_risk',
    check: (record) =>
      !record.evidence || record.evidence.length === 0,
    message: 'No photo evidence submitted',
  },

  // Rule 3 — Abnormally High Quantity
  {
    type: 'high_quantity',
    severity: 'warning',
    check: (record) => {
      const quantityKg =
        record.unit === 'ton' ? record.quantity * 1000 : record.quantity;
      return quantityKg > MAX_QUANTITY_KG;
    },
    message: 'Quantity is unusually high — verify manually',
  },

  // Rule 4 — Duplicate Submission
  {
    type: 'duplicate_submission',
    severity: 'warning',
    check: (record, context) => {
      const recordTime = new Date(record.collected_at).getTime();
      return context.recentRecords.some((prev) => {
        if (prev.id === record.id) return false; // skip self
        const prevTime = new Date(prev.collected_at).getTime();
        const timeDiff = Math.abs(recordTime - prevTime);
        return (
          timeDiff <= DUPLICATE_WINDOW_MS &&
          prev.project_id === record.project_id &&
          prev.worker_id === record.worker_id &&
          prev.waste_type === record.waste_type
        );
      });
    },
    message: 'Similar record submitted recently by same worker',
  },

  // Rule 5 — Location Outside Assigned Site
  {
    type: 'location_outside_site',
    severity: 'high_risk',
    check: (record, context) => {
      if (
        !context.projectGps ||
        record.gps_latitude === null ||
        record.gps_longitude === null
      ) {
        return false; // can't evaluate without coordinates — Rule 1 covers missing GPS
      }
      const distance = getHaversineDistance(
        record.gps_latitude,
        record.gps_longitude,
        context.projectGps.lat,
        context.projectGps.lng
      );
      return distance > MAX_SITE_DISTANCE_METERS;
    },
    message: 'Submission location is far from the assigned site',
  },

  // Rule 6 — Rapid Succession Submissions
  {
    type: 'rapid_succession',
    severity: 'warning',
    check: (record, context) => {
      const recordTime = new Date(record.collected_at).getTime();
      const windowStart = recordTime - RAPID_SUBMISSION_WINDOW_MS;
      const recentByWorker = context.recentRecords.filter((prev) => {
        if (prev.id === record.id) return false; // skip self
        if (prev.worker_id !== record.worker_id) return false;
        const prevTime = new Date(prev.collected_at).getTime();
        return prevTime >= windowStart && prevTime <= recordTime;
      });
      return recentByWorker.length >= RAPID_SUBMISSION_MAX_RECORDS;
    },
    message: 'Multiple submissions in a short time period',
  },
];

// ---------------------------------------------------------------------------
// Verification Engine — Pure Function
// ---------------------------------------------------------------------------

/**
 * Evaluates a collection record against all anomaly rules and derives
 * the verification status and risk score.
 *
 * This is a pure function: no side effects, no network calls.
 * Call it client-side immediately after a record is submitted.
 *
 * @param record  The submitted collection record data.
 * @param context Contextual data (project GPS, recent records for dedup/rapid checks).
 * @returns       VerificationResult with status, risk score, and anomaly flags array.
 */
export function evaluateAnomalies(
  record: CollectionRecord,
  context: AnomalyContext
): VerificationResult {
  const anomalies: AnomalyFlag[] = [];

  for (const rule of ANOMALY_RULES) {
    if (rule.check(record, context)) {
      anomalies.push({
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'anom-' + Math.random().toString(36).substring(2) + Date.now(),
        record_id: record.id,
        anomaly_type: rule.type,
        severity: rule.severity,
        status: 'open',
        details: rule.message,
      });
    }
  }

  // Derive verification status and risk score
  const hasHighRisk = anomalies.some((a) => a.severity === 'high_risk');
  const hasWarnings = anomalies.some((a) => a.severity === 'warning');

  let verification_status: VerificationStatus;
  let risk_score: RiskScore;

  if (anomalies.length === 0) {
    // 0 anomalies → auto-verified
    verification_status = 'verified';
    risk_score = 'normal';
  } else if (hasHighRisk) {
    // 1+ high_risk → pending review with high risk
    verification_status = 'pending_review';
    risk_score = 'high_risk';
  } else if (hasWarnings) {
    // 1+ warning, no high_risk → pending review with warning
    verification_status = 'pending_review';
    risk_score = 'warning';
  } else {
    verification_status = 'pending_review';
    risk_score = 'warning';
  }

  return {
    verification_status,
    risk_score,
    anomalies,
  };
}
