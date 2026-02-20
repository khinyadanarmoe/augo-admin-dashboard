// User related types
export interface User {
  id: string;
  studentId: string;
  name: string;
  nickname: string;
  birthdate: string;
  email: string;
  faculty: string;
  status: import('./constants').UserStatus;
  warningCount: number;
  joinedAt: string;
  avatar?: string;
  bannedAt?: string;
  banExpiresAt?: string;
}

export interface UserProfile extends User {
  totalPosts: number;
  warningCounts: number;
  todayPosts: {
    count: number;
    likes: number;
    dislikes: number;
    reportCounts: number;
  };
  joinDate: string;
}

// Post related types
export interface Post {
  id: string;
  postDate: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  category: string;
  location: string;
  likes: number;
  dislikes: number;
  reportCount: number;
  status: import('./constants').PostStatus;
  isWarned: boolean;
}

// Report related types
export interface Report {
  id: string;
  reportDate: string;
  reporter: {
    name: string;
    id: string;
  };
  reported: {
    name: string;
    id: string;
  };
  postId: string;
  postContent: string;
  category: import('./constants').ReportCategory;
  reportCount: number;
  status: import('./constants').ReportStatus;
  description: string;
}

// Announcement related types
export interface Announcement {
  id: string;
  title: string;
  department: string;
  body?: string;
  startDate: Date | string;
  endDate: Date | string;
  status: import('./constants').AnnouncementStatus | string;
  link?: string;
  latitude?: number;
  longitude?: number;
  isUrgent?: boolean;
  createdByUID?: string;
  createdByName?: string;
  createdByEmail?: string;
  submittedAt?: Date | string;
  rejectedAt?: Date | string | null;
  views?: number;
  photoPaths?: string[];
}

// Warning related types
export interface WarningRecord {
  id: string;
  postId: string;
  postContent: string;
  date: string;
  reportCounts: number;
  reason: string;
  adminId: string;
  adminName: string;
}

// Announcer related types
export interface Announcer {
  id: string;
  name: string;
  email: string;
  password: string;
  affiliation_name: string;
  affiliation_type: import('./constants').AffiliationType;
  phone: string;
  role: string;
  status: import('./constants').AnnouncerStatus;
  total_announcements: number;
  joined_date: Date;
  profilePicture?: string;
}

// Dashboard related types
export interface DashboardMetric {
  title: string;
  value: string | number;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface UserActivity {
  date: string;
  activeUsers: number;
  newUsers: number;
  posts: number;
}

// Configuration types
export interface AdminConfiguration {
  id: string;
  postVisibilityDuration: number; // hours
  dailyFreePostLimit: number;
  reportThresholds: {
    normal: number;
    warning: number;
    urgent: number;
  };
  emojiPinPrice: number;
  dailyFreeCoin: number;
  maxActiveAnnouncements: number;
  urgentAnnouncementThreshold: number; // hours before startDate to show in notification
  banThreshold: number; // warning count threshold for automatic ban
  banDurationDays: number; // duration in days for user ban (default: 30)
  lastUpdated: string;
  updatedBy: string;
}

export interface ConfigurationLog {
  id: string;
  adminId: string;
  adminEmail: string;
  timestamp: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
}

// Component Props types
export interface TableProps<T> {
  data?: T[];
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}