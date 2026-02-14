// User status constants
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  WARNING: 'warning',
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

// Report categories
export const REPORT_CATEGORIES = {
  OFFENSIVE: 'offensive',
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  MISINFORMATION: 'misinformation'
} as const;

// Report status
export const REPORT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

// Announcement status
export const ANNOUNCEMENT_STATUS = {
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  EXPIRED: 'expired',
  REMOVED: 'removed'
} as const;

export type AnnouncementStatus = typeof ANNOUNCEMENT_STATUS[keyof typeof ANNOUNCEMENT_STATUS];

// Announcer affiliation types
export const AFFILIATION_TYPES = {
  STUDENT_ORG: 'student org',
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

// Faculties
export const FACULTIES = {
  VMES: 'VMES',
  BUSINESS: 'Business',
  ENGINEERING: 'Engineering',
  MEDICINE: 'Medicine',
  LAW: 'Law',
  ARTS: 'Arts',
  ALL: 'All'
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
  PARKING_LOT: 'Parking Lot',
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
} as const;

// Content topics for announcements
export const CONTENT_TOPICS = [
  'Exam Schedule',
  'Workshop',
  'Career Fair',
  'Holiday Notice',
  'Academic',
  'Event',
  'Policy'
] as const;

// Sort directions
export const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc'
} as const;