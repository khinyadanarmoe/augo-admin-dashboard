import { useState, useEffect } from 'react';
import { collection, doc, query, where, orderBy, limit, getDocs, getDoc, getCountFromServer, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [
          metrics,
          recentReports,
          pendingAnnouncements,
          recentFlaggedUsers,
          topPosts,
          postCategories,
          topLocations,
          postsOverTime
        ] = await Promise.all([
          fetchMetrics(),
          fetchRecentReports(),
          fetchPendingAnnouncements(),
          fetchRecentFlaggedUsers(),
          fetchTopPosts(),
          fetchPostCategories(),
          fetchTopLocations(),
          fetchPostsOverTime(timeRange)
        ]);

        setData({
          metrics,
          recentReports,
          pendingAnnouncements,
          topPosts,
          postCategories,
          topLocations,
          recentFlaggedUsers,
          postsOverTime
        });
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

async function fetchRecentReports(): Promise<RecentReport[]> {
  try {
    const reportsQuery = query(
      collection(db, 'reports'),
      orderBy('reportDate', 'desc'),
      limit(5)
    );
    
    const snapshot = await getDocs(reportsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const reportDate = data.reportDate?.toDate ? data.reportDate.toDate() : new Date(data.reportDate);
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
        id: doc.id,
        type: data.category || 'Unknown',
        postTitle: data.postContent?.substring(0, 50) || 'No content',
        reporter: data.reporter?.name || 'Anonymous',
        reason: data.description || 'No reason provided',
        status: data.status || 'pending',
        reportedAt
      };
    });
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    return [];
  }
}

async function fetchPendingAnnouncements(): Promise<PendingAnnouncement[]> {
  try {
    // Query without orderBy to avoid index issues - just get pending announcements
    const announcementsQuery = query(
      collection(db, 'announcements'),
      where('status', '==', 'pending'),
      limit(5)
    );
    
    const snapshot = await getDocs(announcementsQuery);
    
    console.log('Pending announcements fetched:', snapshot.size);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Announcement data:', data);
      
      // Handle both createdAt and submitedAt (note: misspelled in DB)
      const timestamp = data.submitedAt || data.createdAt;
      const createdAt = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
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

      // Determine priority based on isUrgent flag or type
      let priority: 'low' | 'medium' | 'high' = 'medium';
      if (data.isUrgent === true) {
        priority = 'high';
      } else if (data.type === 'urgent' || data.category === 'urgent') {
        priority = 'high';
      } else if (data.type === 'general' || data.category === 'general') {
        priority = 'low';
      }

      // Format scheduled date if available
      const scheduledFor = data.startDate ? 
        new Date(data.startDate?.toDate ? data.startDate.toDate() : data.startDate).toLocaleString() : 
        undefined;

      return {
        id: doc.id,
        title: data.title || 'Untitled',
        content: data.body || data.content || data.description || '',
        author: data.createdByName || data.announcerName || data.author || 'Unknown',
        type: data.department || data.type || data.category || 'general',
        priority,
        submittedAt,
        scheduledFor,
        status: data.status
      };
    });
  } catch (error) {
    console.error('Error fetching pending announcements:', error);
    return [];
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
    const categories = ['casual', 'announcement', 'event', 'lost_found', 'complaint'];
    const categoryColors: { [key: string]: string } = {
      casual: 'bg-blue-500',
      announcement: 'bg-green-500',
      event: 'bg-yellow-500',
      lost_found: 'bg-purple-500',
      complaint: 'bg-gray-500'
    };
    const categoryLabels: { [key: string]: string } = {
      casual: 'Casual',
      announcement: 'Announcements',
      event: 'Events',
      lost_found: 'Lost and Found',
      complaint: 'Complaints'
    };

    const counts = await Promise.all(
      categories.map(async (category) => {
        const q = query(collection(db, 'posts'), where('category', '==', category));
        const snapshot = await getCountFromServer(q);
        return {
          name: categoryLabels[category] || category,
          count: snapshot.data().count,
          color: categoryColors[category] || 'bg-gray-500'
        };
      })
    );

    return counts.sort((a, b) => b.count - a.count);
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
