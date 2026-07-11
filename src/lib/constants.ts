/**
 * Configurable thresholds for anomaly detection engine.
 * Adjust these values to calibrate the sensitivity of fraud detection rules.
 */

// Rule 3 — Abnormally High Quantity
// Maximum allowable quantity in kilograms before flagging as anomaly.
export const MAX_QUANTITY_KG = 5000;

// Rule 4 — Duplicate Submission
// Time window in milliseconds to check for duplicate records from the same worker.
export const DUPLICATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// Rule 5 — Location Outside Assigned Site
// Maximum allowable distance in meters between submission GPS and project site GPS.
export const MAX_SITE_DISTANCE_METERS = 500;

// Rule 6 — Rapid Succession Submissions
// Maximum records allowed within the rapid submission time window before flagging.
export const RAPID_SUBMISSION_MAX_RECORDS = 3;

// Time window in milliseconds for rapid succession detection.
export const RAPID_SUBMISSION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
