import { useState, useEffect } from 'react';
import { collection, doc, query, where, orderBy, limit, getDocs, getDoc, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { POST_CATEGORIES, CATEGORY_LABELS } from '@/types/constants';
import { subscribeToPendingAnnouncements } from '@/lib/firestore/announcements';
import { subscribeToRecentReports } from '@/lib/firestore/reports';

export interface DashboardMetrics {
  activeUsers: number;
  totalPosts: number;
  pendingReports: number;
  pendingAnnouncements: number;
}

export interface RecentReport {
  id: string;
  type: string;
  postTitle: string;
  reporter: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reportedAt: string;
}

export interface PendingAnnouncement {
  id: string;
  title: string;
  content: string;
  author: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  submittedAt: string;
  scheduledFor?: string;
  status: string;
}

export interface TopPost {
  id: string;
  title: string;
  author: string;
  views: number;
  likes: number;
  dislikes: number;
  category: string;
  publishedAt: string;
}

export interface PostCategory {
  name: string;
  count: number;
  color: string;
}

export interface LocationData {
  name: string;
  posts: number;
  color: string;
}

export interface FlaggedUser {
  id: string;
  name: string;
  warningCount: number;
  isBanned: boolean;
  flaggedAt: string;
  flaggedAtTimestamp: number;
}

export interface PostTimeData {
  date: string;
  count: number;
}

export type TimeRange = '7 Days' | '30 Days' | '90 Days';

export interface DashboardData {
  metrics: DashboardMetrics;
  recentReports: RecentReport[];
  pendingAnnouncements: PendingAnnouncement[];
  topPosts: TopPost[];
  postCategories: PostCategory[];
  topLocations: LocationData[];
  recentFlaggedUsers: FlaggedUser[];
  postsOverTime: PostTimeData[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7 Days');

  const changeTimeRange = async (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);

    try {
      setLoading(true);
      const postsOverTime = await fetchPostsOverTime(newTimeRange);

      setData(prevData => {
        if (prevData) {
          return {
            ...prevData,
            postsOverTime
          };
        }
        return prevData;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions for announcements and reports (runs once on mount)
  useEffect(() => {
    const unsubAnnouncements = subscribeToPendingAnnouncements(
      (announcements) => {
        console.log('Received pending announcements:', announcements);
        // Transform to dashboard format
        const pendingAnnouncements = announcements.map(ann => {
          const timestamp = ann.submittedAt;
          const createdAt = timestamp ? new Date(timestamp) : new Date();
          const now = new Date();
          const diffMs = now.getTime() - createdAt.getTime();
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let submittedAt = '';
          if (diffHours < 1) {
            submittedAt = 'Just now';
          } else if (diffHours < 24) {
            submittedAt = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
          } else {
            submittedAt = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
          }

          let priority: 'low' | 'medium' | 'high' = 'medium';
          if (ann.isUrgent === true) {
            priority = 'high';
          }

          const scheduledFor = ann.startDate ?
            new Date(ann.startDate).toLocaleString() :
            undefined;

          return {
            id: ann.id,
            title: ann.title || 'Untitled',
            content: ann.body || '',
            author: ann.createdByName || 'Unknown',
            type: ann.department || 'general',
            priority,
            submittedAt,
            scheduledFor,
            status: ann.status
          };
        });

        console.log('Transformed pending announcements for dashboard:', pendingAnnouncements);

        setData(prevData => {
          const newData = {
            metrics: prevData?.metrics || { activeUsers: 0, totalPosts: 0, pendingReports: 0, pendingAnnouncements: 0 },
            recentReports: prevData?.recentReports || [],
            pendingAnnouncements,
            topPosts: prevData?.topPosts || [],
            postCategories: prevData?.postCategories || [],
            topLocations: prevData?.topLocations || [],
            recentFlaggedUsers: prevData?.recentFlaggedUsers || [],
            postsOverTime: prevData?.postsOverTime || []
          };
          console.log('Setting dashboard data with pendingAnnouncements:', newData);
          return newData;
        });
      },
      (error) => {
        console.error('Error in pending announcements subscription:', error);
      }
    );

    const unsubReports = subscribeToRecentReports(
      (reports) => {
        console.log('Received recent reports:', reports);
        // Transform to dashboard format
        const recentReports = reports.map(report => {
          const reportDate = (report.reportDate as any)?.toDate ? (report.reportDate as any).toDate() : new Date(report.reportDate);
          const now = new Date();
          const diffMs = now.getTime() - reportDate.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let reportedAt = '';
          if (diffMins < 60) {
            reportedAt = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
          } else if (diffHours < 24) {
            reportedAt = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
          } else {
            reportedAt = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
          }

          return {
            id: report.id,
            type: CATEGORY_LABELS[report.category as keyof typeof CATEGORY_LABELS] || report.category || 'Unknown',
            postTitle: report.postContent?.substring(0, 50) || 'No content',
            reporter: report.reporter?.name || 'Anonymous',
            reason: report.description || 'No reason provided',
            status: report.status || 'pending',
            reportedAt
          };
        });

        setData(prevData => {
          const newData = {
            metrics: prevData?.metrics || { activeUsers: 0, totalPosts: 0, pendingReports: 0, pendingAnnouncements: 0 },
            recentReports,
            pendingAnnouncements: prevData?.pendingAnnouncements || [],
            topPosts: prevData?.topPosts || [],
            postCategories: prevData?.postCategories || [],
            topLocations: prevData?.topLocations || [],
            recentFlaggedUsers: prevData?.recentFlaggedUsers || [],
            postsOverTime: prevData?.postsOverTime || []
          };
          console.log('Setting dashboard data with recentReports:', newData);
          return newData;
        });
      },
      (error) => {
        console.error('Error in recent reports subscription:', error);
      }
    );

    return () => {
      unsubAnnouncements();
      unsubReports();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch non-realtime data in parallel
        const [
          metrics,
          recentFlaggedUsers,
          topPosts,
          postCategories,
          topLocations,
          postsOverTime
        ] = await Promise.all([
          fetchMetrics(),
          fetchRecentFlaggedUsers(),
          fetchTopPosts(),
          fetchPostCategories(),
          fetchTopLocations(),
          fetchPostsOverTime(timeRange)
        ]);

        setData(prevData => ({
          metrics,
          recentReports: prevData?.recentReports || [],
          pendingAnnouncements: prevData?.pendingAnnouncements || [],
          topPosts,
          postCategories,
          topLocations,
          recentFlaggedUsers,
          postsOverTime
        }));
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [timeRange]);

  return {
    data,
    loading,
    error,
    timeRange,
    changeTimeRange
  };
}

async function fetchMetrics(): Promise<DashboardMetrics> {
  try {
    // Count active users
    const usersQuery = query(collection(db, 'users'), where('status', '==', 'active'));
    const usersSnapshot = await getCountFromServer(usersQuery);
    const activeUsers = usersSnapshot.data().count;

    // Count total posts
    const postsSnapshot = await getCountFromServer(collection(db, 'posts'));
    const totalPosts = postsSnapshot.data().count;

    // Count pending reports
    const reportsQuery = query(collection(db, 'reports'), where('status', '==', 'pending'));
    const reportsSnapshot = await getCountFromServer(reportsQuery);
    const pendingReports = reportsSnapshot.data().count;

    // Count pending announcements
    const pendingAnnouncementsQuery = query(
      collection(db, 'announcements'),
      where('status', '==', 'pending')
    );
    const pendingAnnouncementsSnapshot = await getCountFromServer(pendingAnnouncementsQuery);
    const pendingAnnouncements = pendingAnnouncementsSnapshot.data().count;

    return {
      activeUsers,
      totalPosts,
      pendingReports,
      pendingAnnouncements
    };
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return {
      activeUsers: 0,
      totalPosts: 0,
      pendingReports: 0,
      pendingAnnouncements: 0
    };
  }
}

async function fetchTopPosts(): Promise<TopPost[]> {
  try {
    // Fetch top posts ordered by likeCount
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('likeCount', 'desc'),
      limit(10)
    );

    const snapshot = await getDocs(postsQuery);

    // Fetch user names for each post
    const postsWithUsers = await Promise.all(
      snapshot.docs.map(async (docRef) => {
        const data = docRef.data();
        const postDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
        const now = new Date();
        const diffMs = now.getTime() - postDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        let publishedAt = '';
        if (diffDays === 0) {
          const diffHours = Math.floor(diffMs / 3600000);
          publishedAt = diffHours === 0 ? 'Just now' : `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 1) {
          publishedAt = 'Yesterday';
        } else if (diffDays < 7) {
          publishedAt = `${diffDays} days ago`;
        } else {
          const weeks = Math.floor(diffDays / 7);
          publishedAt = `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        }

        // Fetch user name
        let author = 'Anonymous';
        if (data.userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', data.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              author = userData.name || userData.nickname || 'Anonymous';
            }
          } catch {
            // keep default
          }
        }

        return {
          id: docRef.id,
          title: data.content?.substring(0, 80) || 'No content',
          author,
          views: data.views || 0,
          likes: data.likeCount || 0,
          dislikes: data.dislikeCount || 0,
          category: data.category || 'General',
          publishedAt
        };
      })
    );

    return postsWithUsers;
  } catch (error) {
    console.error('Error fetching top posts:', error);
    return [];
  }
}

async function fetchPostCategories(): Promise<PostCategory[]> {
  try {
    // Fetch all posts and aggregate by category
    const postsSnapshot = await getDocs(collection(db, 'posts'));

    const categoryCounts: { [key: string]: number } = {};

    postsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Category name normalization: Firebase keys to display values
    const categoryKeyToDisplay: { [key: string]: string } = {
      'campus_life': POST_CATEGORIES.CAMPUS_LIFE,
      'casual': POST_CATEGORIES.CASUAL,
      'lost_and_found': POST_CATEGORIES.LOST_AND_FOUND,
      'complaints': POST_CATEGORIES.COMPLAINTS,
      'safety': POST_CATEGORIES.SAFETY,
      'academic': POST_CATEGORIES.ACADEMIC,
      'event': POST_CATEGORIES.EVENT,
      'other': POST_CATEGORIES.OTHER,
      // Also handle if they're already stored as display values
      [POST_CATEGORIES.CAMPUS_LIFE]: POST_CATEGORIES.CAMPUS_LIFE,
      [POST_CATEGORIES.CASUAL]: POST_CATEGORIES.CASUAL,
      [POST_CATEGORIES.LOST_AND_FOUND]: POST_CATEGORIES.LOST_AND_FOUND,
      [POST_CATEGORIES.COMPLAINTS]: POST_CATEGORIES.COMPLAINTS,
      [POST_CATEGORIES.SAFETY]: POST_CATEGORIES.SAFETY,
      [POST_CATEGORIES.ACADEMIC]: POST_CATEGORIES.ACADEMIC,
      [POST_CATEGORIES.EVENT]: POST_CATEGORIES.EVENT,
      [POST_CATEGORIES.OTHER]: POST_CATEGORIES.OTHER
    };

    const categoryColors: { [key: string]: string } = {
      [POST_CATEGORIES.CAMPUS_LIFE]: '#3B82F6',     // Blue
      [POST_CATEGORIES.CASUAL]: '#10B981',          // Green
      [POST_CATEGORIES.LOST_AND_FOUND]: '#F59E0B',  // Amber
      [POST_CATEGORIES.COMPLAINTS]: '#EF4444',      // Red
      [POST_CATEGORIES.SAFETY]: '#DC2626',          // Dark Red
      [POST_CATEGORIES.ACADEMIC]: '#8B5CF6',        // Purple
      [POST_CATEGORIES.EVENT]: '#EC4899',           // Pink
      [POST_CATEGORIES.OTHER]: '#6B7280'            // Gray
    };

    // Use POST_CATEGORIES constant for all categories
    const allCategories = Object.values(POST_CATEGORIES);

    const result = allCategories.map(categoryName => {
      // Find the count from Firebase (checking both normalized and potential formats)
      let count = 0;
      for (const [fbCategory, fbCount] of Object.entries(categoryCounts)) {
        const normalizedName = categoryKeyToDisplay[fbCategory.toLowerCase()] || categoryKeyToDisplay[fbCategory];
        if (normalizedName === categoryName) {
          count += fbCount;
        }
      }

      return {
        name: categoryName,
        count: count,
        color: categoryColors[categoryName] || '#6B7280'
      };
    });

    return result;
  } catch (error) {
    console.error('Error fetching post categories:', error);
    return [];
  }
}

async function fetchTopLocations(): Promise<LocationData[]> {
  try {
    const postsSnapshot = await getDocs(collection(db, 'posts'));

    const locationCounts: { [key: string]: number } = {};

    postsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const location = data.location || 'Unknown';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    const locationColors: { [key: string]: string } = {
      'MSME': 'bg-purple-400',
      'AU Mall': 'bg-red-400',
      'VMES': 'bg-cyan-400',
      'CL': 'bg-orange-400',
      'Art': 'bg-blue-600',
      'Unknown': 'bg-gray-400'
    };

    const locations = Object.entries(locationCounts)
      .map(([name, count]) => ({
        name,
        posts: count,
        color: locationColors[name] || 'bg-gray-400'
      }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);

    return locations;
  } catch (error) {
    console.error('Error fetching top locations:', error);
    return [];
  }
}

async function fetchRecentFlaggedUsers(): Promise<FlaggedUser[]> {
  try {
    // Get ban threshold from config (default 5)
    let banThreshold = 5;
    try {
      const configRef = doc(db, 'admin_configuration', 'default');
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        banThreshold = configSnap.data().banThreshold || 5;
      }
    } catch { /* use default */ }

    // Get all users whose warningCount >= banThreshold (auto-banned users)
    const usersQuery = query(
      collection(db, 'users'),
      where('warningCount', '>=', banThreshold)
    );

    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.map(doc => {
      const data = doc.data();

      // Use lastWarningDate or bannedAt or any available timestamp
      const timestamp = data.bannedAt || data.lastWarningDate || data.updatedAt;
      const flaggedDate = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp || Date.now());

      // Format: "10 Nov 2026, 11:00 PM"
      const flaggedAt = flaggedDate.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      return {
        id: doc.id,
        name: data.displayName || data.name || data.nickname || 'Unknown User',
        warningCount: data.warningCount || 0,
        isBanned: (data.warningCount || 0) >= banThreshold,
        flaggedAt,
        flaggedAtTimestamp: flaggedDate.getTime()
      };
    }).sort((a, b) => b.flaggedAtTimestamp - a.flaggedAtTimestamp);
  } catch (error) {
    console.error('Error fetching flagged users:', error);
    return [];
  }
}

async function fetchPostsOverTime(timeRange: TimeRange = '7 Days'): Promise<PostTimeData[]> {
  try {
    // Determine the number of days based on time range
    const days = timeRange === '7 Days' ? 7 : timeRange === '30 Days' ? 30 : 90;

    // Get posts from the specified time range
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const postsQuery = query(
      collection(db, 'posts'),
      where('date', '>=', Timestamp.fromDate(daysAgo)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(postsQuery);

    // Group posts by date
    const postsByDate: { [key: string]: number } = {};

    // Initialize the specified number of days with 0 counts
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      postsByDate[dateKey] = 0;
    }

    // Count posts for each date
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const postDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
      const dateKey = postDate.toISOString().split('T')[0];
      if (postsByDate.hasOwnProperty(dateKey)) {
        postsByDate[dateKey]++;
      }
    });

    // Convert to array format
    return Object.entries(postsByDate).map(([date, count]) => ({
      date,
      count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  } catch (error) {
    console.error('Error fetching posts over time:', error);
    return [];
  }
}
