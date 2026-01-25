// Re-export all types for easy importing
export * from './index';
export * from './constants';

// Re-export utilities
export * from '../utils/colors';

// Import types for type guards
import type { User, Post, Report, Announcement, Announcer } from './index';

// Type guards for runtime type checking
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.email === 'string';
};

export const isPost = (obj: any): obj is Post => {
  return obj && typeof obj.id === 'string' && typeof obj.content === 'string' && obj.user;
};

export const isReport = (obj: any): obj is Report => {
  return obj && typeof obj.id === 'string' && obj.reporter && obj.reported;
};

export const isAnnouncement = (obj: any): obj is Announcement => {
  return obj && typeof obj.id === 'string' && typeof obj.content === 'string' && typeof obj.author === 'string';
};

export const isAnnouncer = (obj: any): obj is Announcer => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string' && typeof obj.contact === 'string';
};