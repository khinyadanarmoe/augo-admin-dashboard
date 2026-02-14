import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAdminConfiguration } from '@/hooks/useAdminConfiguration';
import { subscribeToPostsUpdates } from '@/lib/firestore/posts';
import { fetchAnnouncements } from '@/lib/firestore/announcements';
import { Post, Announcement } from '@/types/export';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = '' }: NotificationBellProps) {
  const router = useRouter();
  const { config, shouldMarkPostAsUrgent, getPostSeverityLevel } = useAdminConfiguration();
  const [posts, setPosts] = useState<Post[]>([]);
  const [urgentCount, setUrgentCount] = useState(0);
  const [urgentPosts, setUrgentPosts] = useState<Post[]>([]);
  const [upcomingAnnouncements, setUpcomingAnnouncements] = useState<Announcement[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Subscribe to posts updates to monitor report counts
    const unsubscribe = subscribeToPostsUpdates(
      (updatedPosts) => {
        setPosts(updatedPosts);
      },
      (error) => {
        console.error('Error subscribing to posts for notifications:', error);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    // Count posts that exceed urgent review threshold and are still active
    if (config && posts.length > 0) {
      const processUrgentPosts = () => {
        const filteredUrgentPosts = posts.filter(post => 
          shouldMarkPostAsUrgent(post.reportCount) && 
          post.status !== 'expired' && 
          post.status !== 'removed'
        );
        setUrgentPosts(filteredUrgentPosts);
        
        // Log for debugging
        console.log('Urgent posts found:', filteredUrgentPosts.length);
        console.log('Posts with urgent level:', posts.filter(post => getPostSeverityLevel(post.reportCount) === 'urgent'));
      };
      
      processUrgentPosts();
    }
  }, [config, posts, shouldMarkPostAsUrgent, getPostSeverityLevel]);

  // Fetch announcements starting within configured threshold
  useEffect(() => {
    const fetchUpcomingAnnouncements = async () => {
      try {
        const announcements = await fetchAnnouncements();
        const now = new Date();
        
        // Use configured threshold or default to 48 hours
        const thresholdHours = config?.urgentAnnouncementThreshold || 48;
        const thresholdTime = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);
        
        const upcoming = announcements.filter(announcement => {
          const startDate = new Date(announcement.startDate);
          return announcement.status === 'pending' && 
                 startDate > now && 
                 startDate <= thresholdTime;
        });
        
        setUpcomingAnnouncements(upcoming);
      } catch (error) {
        console.error('Error fetching upcoming announcements:', error);
      }
    };

    fetchUpcomingAnnouncements();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUpcomingAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);

  // Update total urgent count
  useEffect(() => {
    setUrgentCount(urgentPosts.length + upcomingAnnouncements.length);
  }, [urgentPosts, upcomingAnnouncements]);

  const handleBellClick = () => {
    const newState = !isDropdownOpen;
    setIsDropdownOpen(newState);
  };

  const handleReviewClick = (postId: string) => {
    setIsDropdownOpen(false);
    // Navigate to reports page with post filter and highlight parameters
    router.push({
      pathname: '/reports',
      query: {
        filterBy: 'postId',
        postId: postId,
        highlight: postId,
        autoScroll: 'true'
      }
    });
  };

  const handleAnnouncementClick = (announcementId: string) => {
    setIsDropdownOpen(false);
    // Navigate to announcements page
    router.push('/announcements');
  };

  const getTimeUntilStart = (startDate: Date | string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diffInMinutes = Math.floor((start.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} minutes`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''}`;
    return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) > 1 ? 's' : ''}`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Icon Container */}
      <button
        onClick={handleBellClick}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
          urgentCount > 0 
            ? 'bg-red-500 hover:bg-red-600 shadow-lg' 
            : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
        }`}
      >
        {/* Bell Icon */}
        <svg 
          className={`w-5 h-5 ${
            urgentCount > 0 ? 'text-white' : 'text-gray-600 dark:text-gray-300'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>

        {/* Notification Badge */}
        {urgentCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-gray-900">
              {urgentCount > 9 ? '9+' : urgentCount}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div 
          className="absolute top-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-hidden z-9999"
        >
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications {urgentCount > 0 && `(${urgentCount})`}
            </h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {urgentCount === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No urgent notifications</p>
              </div>
            ) : (
              <>
                {/* Upcoming Announcements */}
                {upcomingAnnouncements.map((announcement) => (
                  <div key={`announcement-${announcement.id}`} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-start space-x-3">
                      <div className="shrink-0 mt-1">
                        📢
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Upcoming Announcement
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {announcement.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Starts in {getTimeUntilStart(announcement.startDate)} • {announcement.department}
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => handleAnnouncementClick(announcement.id)}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800 rounded-full transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Urgent Posts */}
                {urgentPosts.map((post) => (
                  <div key={`post-${post.id}`} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-start space-x-3">
                      <div className="shrink-0 mt-1">
                        🔴
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Urgent report
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          One post exceeded report threshold
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {post.reportCount} reports • {formatRelativeTime(post.postDate)}
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => handleReviewClick(post.id)}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 rounded-full transition-colors"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}