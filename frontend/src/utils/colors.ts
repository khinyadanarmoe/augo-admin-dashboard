// Indicator colors for consistent theming across the application

export const PostCategoryColors = {
  casual: 'bg-yellow-400',
  announcements: 'bg-green-500',
  events: 'bg-yellow-500',
  'lost & found': 'bg-purple-500',
  complaints: 'bg-gray-500',
  academic: 'bg-blue-500'
};

export const UserStatusColors = {
  active: 'bg-green-500',
  warning: 'bg-yellow-500',
  banned: 'bg-red-500',
  inactive: 'bg-gray-500'
};

export const StatisticsColors = {
  totalPosts: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400'
  },
  reportCounts: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400'
  },
  likes: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400'
  },
  warnings: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400'
  }
};

// Helper functions to get indicator colors
export const getPostCategoryIndicator = (category: string) => {
  const normalizedCategory = category.toLowerCase().trim();
  return PostCategoryColors[normalizedCategory as keyof typeof PostCategoryColors] || PostCategoryColors.casual;
};

export const getUserStatusIndicator = (status: string) => {
  const normalizedStatus = status.toLowerCase().trim();
  return UserStatusColors[normalizedStatus as keyof typeof UserStatusColors] || UserStatusColors.inactive;
};

// Action button colors
export const ActionColors = {
  warn: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  ban: 'bg-red-600 hover:bg-red-700 text-white',
  unban: 'bg-green-600 hover:bg-green-700 text-white',
  primary: 'bg-purple-600 hover:bg-purple-700 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white'
};

// Announcement status colors for consistent theming
export const AnnouncementStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  expired: 'bg-gray-700 text-white dark:bg-gray-800 dark:text-gray-100',
  declined: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  removed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
};

export const getAnnouncementStatusColor = (status: string) => {
  const normalizedStatus = status.toLowerCase().trim();
  return AnnouncementStatusColors[normalizedStatus as keyof typeof AnnouncementStatusColors] || AnnouncementStatusColors.pending;
};