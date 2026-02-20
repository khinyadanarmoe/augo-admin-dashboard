/**
 * Utility functions for announcement status colors and formatting
 */

export const getAnnouncementStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case 'active':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case 'scheduled':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case 'expired':
            return 'bg-gray-700 text-white dark:bg-gray-800 dark:text-gray-100';
        case 'declined':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
        case 'removed':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
};

export const getAnnouncementStatusIcon = (status: string): string => {
    switch (status?.toLowerCase()) {
        case 'pending':
            return '🟡';
        case 'active':
            return '🟢';
        case 'scheduled':
            return '🔵';
        case 'expired':
            return '⚫';
        case 'declined':
            return '🟣';
        case 'removed':
            return '🟤';
        default:
            return '❓';
    }
};

export const formatAnnouncementStatus = (status: string): string => {
    switch (status?.toLowerCase()) {
        case 'pending':
            return 'Pending Approval';
        case 'active':
            return 'Active';
        case 'scheduled':
            return 'Scheduled';
        case 'expired':
            return 'Expired';
        case 'declined':
            return 'Declined';
        case 'removed':
            return 'Removed';
        default:
            return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
    }
};