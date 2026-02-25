// User status constants
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  WARNING: 'warning',
  SUSPENDED: 'suspended',
  BANNED: 'banned'
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// Post status constants
export const POST_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REMOVED: 'removed'
} as const;

export type PostStatus = typeof POST_STATUS[keyof typeof POST_STATUS];

// Report categories with severity levels
export const REPORT_CATEGORIES = {
  // High severity (🔴 Red) - Auto-removes post
  THREATS_VIOLENCE: 'threats_violence',
  NUDITY: 'inappropriate',
  HATE_SPEECH: 'hate_speech',
  SCAM: 'scam',

  // Medium severity (🟡 Yellow)
  HARASSMENT: 'harassment',
  IMPERSONATION: 'impersonation',
  MISINFORMATION: 'misinformation',

  // Low severity (🟢 Green)
  SPAM: 'spam',

  // Other (🟤 Brown)
  OTHER: 'other'
} as const;

export type ReportCategory = typeof REPORT_CATEGORIES[keyof typeof REPORT_CATEGORIES];

// Report severity levels
export const REPORT_SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  OTHER: 'other'
} as const;

export type ReportSeverity = typeof REPORT_SEVERITY[keyof typeof REPORT_SEVERITY];

// Map categories to severity
export const CATEGORY_SEVERITY_MAP: Record<ReportCategory, ReportSeverity> = {
  [REPORT_CATEGORIES.THREATS_VIOLENCE]: REPORT_SEVERITY.HIGH,
  [REPORT_CATEGORIES.NUDITY]: REPORT_SEVERITY.HIGH,
  [REPORT_CATEGORIES.HATE_SPEECH]: REPORT_SEVERITY.HIGH,
  [REPORT_CATEGORIES.SCAM]: REPORT_SEVERITY.HIGH,
  [REPORT_CATEGORIES.HARASSMENT]: REPORT_SEVERITY.MEDIUM,
  [REPORT_CATEGORIES.IMPERSONATION]: REPORT_SEVERITY.MEDIUM,
  [REPORT_CATEGORIES.MISINFORMATION]: REPORT_SEVERITY.MEDIUM,
  [REPORT_CATEGORIES.SPAM]: REPORT_SEVERITY.LOW,
  [REPORT_CATEGORIES.OTHER]: REPORT_SEVERITY.OTHER
};

// Severity display labels
export const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  [REPORT_SEVERITY.HIGH]: '🔴 High',
  [REPORT_SEVERITY.MEDIUM]: '🟡 Medium',
  [REPORT_SEVERITY.LOW]: '🟢 Low',
  [REPORT_SEVERITY.OTHER]: '🟤 Other'
};

// Category display labels
export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  [REPORT_CATEGORIES.THREATS_VIOLENCE]: 'Threats / Violence',
  [REPORT_CATEGORIES.NUDITY]: 'Inappropriate',
  [REPORT_CATEGORIES.HATE_SPEECH]: 'Hate Speech',
  [REPORT_CATEGORIES.SCAM]: 'Scam',
  [REPORT_CATEGORIES.HARASSMENT]: 'Harassment',
  [REPORT_CATEGORIES.IMPERSONATION]: 'Impersonation',
  [REPORT_CATEGORIES.MISINFORMATION]: 'Misinformation',
  [REPORT_CATEGORIES.SPAM]: 'Spam',
  [REPORT_CATEGORIES.OTHER]: 'Other'
};

// Report status
export const REPORT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

// Announcement status
export const ANNOUNCEMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  EXPIRED: 'expired',
  DECLINED: 'declined',
  REMOVED: 'removed'
} as const;

export type AnnouncementStatus = typeof ANNOUNCEMENT_STATUS[keyof typeof ANNOUNCEMENT_STATUS];

// Announcer affiliation types
export const AFFILIATION_TYPES = {
  STUDENT_ORG: 'student_org',
  FACULTY: 'faculty',
  OFFICE: 'office'
} as const;

export type AffiliationType = typeof AFFILIATION_TYPES[keyof typeof AFFILIATION_TYPES];

// Announcer status
export const ANNOUNCER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type AnnouncerStatus = typeof ANNOUNCER_STATUS[keyof typeof ANNOUNCER_STATUS];

// Affiliation Types
export const AFFILIATION_TYPE = {
  FACULTY: 'Faculty',
  OFFICE: 'Office',
  STUDENT_ORG: 'Student Organization'
} as const;

// AR Model Rarity
export const AR_RARITY = {
  ULTRA_RARE: 'Ultra Rare',
  RARE: 'Rare',
  UNCOMMON: 'Uncommon',
  COMMON: 'Common',
  VERY_COMMON: 'Very Common',
  UNLIMITED: 'Unlimited'
} as const;

export type ARRarity = typeof AR_RARITY[keyof typeof AR_RARITY];

// Rarity catchable time ranges
export const RARITY_CATCHABLE_RANGES = {
  'Ultra Rare': { min: 1, max: 1, color: 'Mint' },
  'Rare': { min: 2, max: 20, color: 'Dark Blue' },
  'Uncommon': { min: 21, max: 79, color: 'Green' },
  'Common': { min: 80, max: 150, color: 'Pink' },
  'Very Common': { min: 151, max: 300, color: 'Red' },
  'Unlimited': { min: 301, max: 999999, color: 'Gray' }
} as const;

// Specific Affiliations by Type
export const AFFILIATIONS = {
  Faculty: [
    'Architecture and Design',
    'Arts',
    'Biotechnology',
    'Communication Arts',
    'Engineering and Computer Science',
    'Law',
    'Management and Economics',
    'Music',
    'Nursing Science'
  ],
  Office: [
    'Career Services',
    'Emergency',
    'Registrar',
    'Student Affairs',
    'Study Abroad'
  ],
  'Student Organization': [
    'Accounting Committee',
    'AIESEC',
    'Art Committee',
    'AUISC',
    'AUMSC',
    'AUSO',
    'DBM Committee',
    'VMES Committee'
  ]
} as const;

// Legacy Faculties (for backward compatibility)
export const FACULTIES = {
  ARCHITECTURE_DESIGN: 'Architecture and Design',
  ARTS: 'Arts',
  BIOTECHNOLOGY: 'Biotechnology',
  COMMUNICATION_ARTS: 'Communication Arts',
  ENGINEERING_CS: 'Engineering and Computer Science',
  LAW: 'Law',
  MANAGEMENT_ECONOMICS: 'Management and Economics',
  MUSIC: 'Music',
  NURSING: 'Nursing Science',
} as const;

// Locations
export const LOCATIONS = {
  CL_BUILDING: 'CL Building',
  ADMIN_OFFICE: 'Administration Office',
  SM: 'SM',
  SG: 'SG',
  SR: 'SR',
  LIBRARY: 'Library',
  CANTEEN: 'Canteen',
  MSME: 'MSME',
  MSE: 'MSE',
  VMES: 'VMES',
  SLM: 'SLM',
  CA: 'CA',
  SC: 'SC',
  JOHNPAUL: 'John Paul',
  AUMALL: 'AU Mall',
  DORM: 'Dormitory',


} as const;

// Post categories
export const POST_CATEGORIES = {
  CAMPUS_LIFE: 'Campus Life',
  CASUAL: 'Casual',
  LOST_AND_FOUND: 'Lost and Found',
  COMPLAINTS: 'Complaints',
  SAFETY: 'Safety',
  ACADEMIC: 'Academic',
  EVENT: 'Event',
  OTHER: 'Other'
} as const;

// Content topics for announcements
export const CONTENT_TOPICS = [
  'Academic',
  'Registration & Finance',
  'Events',
  'Career',
  'Scholarship works',
  'Administrative',
  'Emergency & Safety'
] as const;

// Sort directions
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc'
} as const;