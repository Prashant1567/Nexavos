/**
 * Internationalization (i18n) Architecture — MVP
 *
 * Usage:
 *   import { t, setLang, getLang } from '@/lib/i18n';
 *   <button>{t('submit_record')}</button>
 *
 * All UI strings should be wired through t() even if Hindi
 * translations are placeholders in this MVP release.
 */

export type Lang = 'en' | 'hi';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Global
    app_name: 'Waste dMRV',
    app_tagline: 'Waste Verification Platform',
    online: 'Online',
    offline: 'Offline',
    syncing: 'Syncing...',
    saved: 'saved',
    logout: 'Logout',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading...',
    back: 'Back',
    error: 'Error',
    success: 'Success',

    // Auth
    enter_mobile: 'Enter your mobile number',
    send_otp: 'Send OTP',
    enter_otp: 'Enter the 6-digit code',
    verify: 'Verify',
    resend_otp: "Didn't receive it? Resend in",

    // Collection Flow
    which_site: 'Which site are you at?',
    search_projects: 'Search projects...',
    waste_type: 'Waste Type',
    quantity: 'Quantity',
    unit: 'Unit',
    notes_placeholder: 'Any issues? (optional)',
    take_photo: 'Take Photo',
    submit_record: 'Submit Record',
    submitting: 'Submitting...',
    record_saved_online: 'Record synced successfully!',
    record_saved_offline: 'Saved offline — will sync when online.',
    gps_acquired: 'GPS Acquired',
    gps_pending: 'Acquiring GPS...',
    gps_failed: 'GPS unavailable',

    // Dashboard
    good_morning: 'Good morning',
    good_afternoon: 'Good afternoon',
    good_evening: 'Good evening',
    overview: 'Overview',
    projects: 'Projects',
    records: 'Records',
    waste_collected_today: 'Waste Collected (Today)',
    verified_records_today: 'Verified Records (Today)',
    pending_review: 'Pending Review',
    rejected_records: 'Rejected Records',
    urgent_review: 'records need urgent review',
    review_now: 'Review Now',
    daily_collection_volume: 'Daily Collection Volume (Last 7 Days)',
    recent_activity: 'Recent Activity Feed',

    // Review
    verification_queue: 'Verification Queue',
    pending: 'Pending',
    all_records: 'All Records',
    approve: 'Approve',
    reject: 'Reject',
    request_clarification: 'Request Clarification',
    rejection_reason: 'Rejection reason',
    confirm_rejection: 'Confirm Rejection',
    all_reviewed: 'All records reviewed',
    nothing_pending: 'Nothing pending.',

    // Reports
    compliance_reports: 'Compliance Reports',
    from_date: 'From Date',
    to_date: 'To Date',
    select_projects: 'Select Projects',
    generate_report: 'Generate Report',
    export_pdf: 'Export as PDF',
    export_csv: 'Export as CSV',
    total_waste_collected: 'Total Waste Collected',
    verified_count: 'Verified Records',
    rejected_count: 'Rejected Records',
    anomaly_detections: 'Anomaly Detections',
    evidence_submissions: 'Evidence Submissions',
    active_projects: 'Active Projects',

    // Bottom Nav
    nav_home: 'Home',
    nav_collect: 'Collect',
    nav_review: 'Review',
    nav_reports: 'Reports',
  },

  hi: {
    // Global
    app_name: 'वेस्ट dMRV',
    app_tagline: 'अपशिष्ट सत्यापन मंच',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन',
    syncing: 'सिंक हो रहा है...',
    saved: 'सहेजा गया',
    logout: 'लॉग आउट',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    loading: 'लोड हो रहा है...',
    back: 'वापस',
    error: 'त्रुटि',
    success: 'सफल',

    // Auth
    enter_mobile: 'अपना मोबाइल नंबर दर्ज करें',
    send_otp: 'OTP भेजें',
    enter_otp: '6 अंकों का कोड दर्ज करें',
    verify: 'सत्यापित करें',
    resend_otp: 'प्राप्त नहीं हुआ? पुनः भेजें',

    // Collection Flow
    which_site: 'आप किस साइट पर हैं?',
    search_projects: 'प्रोजेक्ट खोजें...',
    waste_type: 'अपशिष्ट प्रकार',
    quantity: 'मात्रा',
    unit: 'इकाई',
    notes_placeholder: 'कोई समस्या? (वैकल्पिक)',
    take_photo: 'फ़ोटो लें',
    submit_record: 'रिकॉर्ड सबमिट करें',
    submitting: 'सबमिट हो रहा है...',
    record_saved_online: 'रिकॉर्ड सफलतापूर्वक सिंक हो गया!',
    record_saved_offline: 'ऑफ़लाइन सहेजा गया — ऑनलाइन होने पर सिंक होगा।',
    gps_acquired: 'GPS प्राप्त',
    gps_pending: 'GPS प्राप्त हो रहा है...',
    gps_failed: 'GPS उपलब्ध नहीं',

    // Dashboard
    good_morning: 'सुप्रभात',
    good_afternoon: 'शुभ दोपहर',
    good_evening: 'शुभ संध्या',
    overview: 'अवलोकन',
    projects: 'प्रोजेक्ट',
    records: 'रिकॉर्ड',
    waste_collected_today: 'आज एकत्र अपशिष्ट',
    verified_records_today: 'आज सत्यापित रिकॉर्ड',
    pending_review: 'समीक्षा लंबित',
    rejected_records: 'अस्वीकृत रिकॉर्ड',
    urgent_review: 'रिकॉर्ड तत्काल समीक्षा की आवश्यकता है',
    review_now: 'अभी समीक्षा करें',
    daily_collection_volume: 'दैनिक संग्रह मात्रा (पिछले 7 दिन)',
    recent_activity: 'हाल की गतिविधि',

    // Review
    verification_queue: 'सत्यापन कतार',
    pending: 'लंबित',
    all_records: 'सभी रिकॉर्ड',
    approve: 'स्वीकृत',
    reject: 'अस्वीकार',
    request_clarification: 'स्पष्टीकरण का अनुरोध',
    rejection_reason: 'अस्वीकृति का कारण',
    confirm_rejection: 'अस्वीकृति की पुष्टि करें',
    all_reviewed: 'सभी रिकॉर्ड की समीक्षा हो गई',
    nothing_pending: 'कुछ लंबित नहीं है।',

    // Reports
    compliance_reports: 'अनुपालन रिपोर्ट',
    from_date: 'से तारीख',
    to_date: 'तक तारीख',
    select_projects: 'प्रोजेक्ट चुनें',
    generate_report: 'रिपोर्ट तैयार करें',
    export_pdf: 'PDF निर्यात करें',
    export_csv: 'CSV निर्यात करें',
    total_waste_collected: 'कुल एकत्र अपशिष्ट',
    verified_count: 'सत्यापित रिकॉर्ड',
    rejected_count: 'अस्वीकृत रिकॉर्ड',
    anomaly_detections: 'विसंगति पहचान',
    evidence_submissions: 'प्रमाण सबमिशन',
    active_projects: 'सक्रिय प्रोजेक्ट',

    // Bottom Nav
    nav_home: 'होम',
    nav_collect: 'संग्रह',
    nav_review: 'समीक्षा',
    nav_reports: 'रिपोर्ट',
  },
};

// ─── Runtime state ────────────────────────────────
let currentLang: Lang = 'en';

export function setLang(lang: Lang): void {
  currentLang = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('dmrv-lang', lang);
  }
}

export function getLang(): Lang {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('dmrv-lang');
    if (stored === 'en' || stored === 'hi') {
      currentLang = stored;
    }
  }
  return currentLang;
}

export function t(key: string): string {
  if (typeof window !== 'undefined' && currentLang === 'en') {
    const stored = localStorage.getItem('dmrv-lang');
    if (stored === 'hi') currentLang = 'hi';
  }
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

/** Get all available languages */
export function getAvailableLanguages(): { code: Lang; label: string }[] {
  return [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
  ];
}
