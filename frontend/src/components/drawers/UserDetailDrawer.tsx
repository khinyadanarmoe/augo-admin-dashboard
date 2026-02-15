import React, { useState, useEffect } from 'react';
import { User, USER_STATUS, getUserStatusIndicator, getPostCategoryIndicator, ActionColors, StatisticsColors } from '@/types/export';
import { fetchUserById } from '@/lib/firestore/users';
import { Post } from '@/types';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import UserPostsDrawer from './UserPostsDrawer';

interface UserDetailDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onWarn?: (userId: string) => void;
  onBanToggle?: (userId: string, currentStatus: string) => void;
}

export default function UserDetailDrawer({ user, isOpen, onClose, onWarn, onBanToggle }: UserDetailDrawerProps) {
  const [showPostsDrawer, setShowPostsDrawer] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userStats, setUserStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalDislikes: 0,
    totalReports: 0,
    todayPosts: 0
  });
  const [loading, setLoading] = useState(false);
  
  // Fetch user posts and calculate statistics
  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch posts by user (removed orderBy to avoid index requirement)
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      
      const postsSnapshot = await getDocs(postsQuery);
      const posts: Post[] = [];
      
      for (const doc of postsSnapshot.docs) {
        const data = doc.data();
        const post: Post = {
          id: doc.id,
          content: data.content || '',
          user: {
            id: userId,
            name: user?.name || 'Unknown User',
            avatar: user?.avatar
          },
          postDate: data.date || data.postDate || new Date().toISOString(),
          category: data.category || 'General',
          location: data.location || 'Campus',
          likes: data.likeCount || data.likes || 0,
          dislikes: data.dislikeCount || data.dislikes || 0,
          reportCount: data.reportCount || data.reports || 0,
          status: data.status || 'active',
          isWarned: data.isWarned || false
        };
        posts.push(post);
      }
      
      // Sort posts by date after fetching (most recent first)
      posts.sort((a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime());
      
      setUserPosts(posts);
      
      // Calculate statistics
      const totalPosts = posts.length;
      const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
      const totalDislikes = posts.reduce((sum, post) => sum + post.dislikes, 0);
      const totalReports = posts.reduce((sum, post) => sum + post.reportCount, 0);
      
      // Count today's posts
      const today = new Date().toDateString();
      const todayPosts = posts.filter(post => 
        new Date(post.postDate).toDateString() === today
      ).length;
      
      setUserStats({
        totalPosts,
        totalLikes,
        totalDislikes,
        totalReports,
        todayPosts
      });
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when user changes
  useEffect(() => {
    if (user && isOpen) {
      fetchUserData(user.id);
    }
  }, [user?.id, isOpen]);

  // Helper function to format relative time
  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isOpen || !user) return null;

  const handleViewAllPosts = () => {
    setShowPostsDrawer(true);
  };

  const handleBackToProfile = () => {
    setShowPostsDrawer(false);
  };

  const handleCloseDrawers = () => {
    setShowPostsDrawer(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-125 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* User Avatar and Basic Info - Left-Right Layout */}
          <div className="flex items-center space-x-4 mb-4">
            {/* Profile Picture - Left Side */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600 dark:text-purple-300">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              {/* Status Indicator */}
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                getUserStatusIndicator(user.status)
              }`}></div>
            </div>
            
            {/* User Info - Right Side */}
            <div className="flex-1 min-w-0 h-20 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {user.name}
              </h3>
              
              {/* Basic Details */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Join Date:</span>
                  <span className="text-gray-900 dark:text-white">{new Date(user.joinedAt || new Date()).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="text-gray-900 dark:text-white text-right truncate max-w-50">{user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Faculty:</span>
                  <span className="text-gray-900 dark:text-white">{user.faculty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`${StatisticsColors.totalPosts.bg} rounded-lg p-4 text-center`}>
              <div className={`text-2xl font-bold ${StatisticsColors.totalPosts.text}`}>
                {loading ? '...' : userStats.totalPosts}
              </div>
              <div className={`text-sm ${StatisticsColors.totalPosts.text}`}>
                Total Posts
              </div>
            </div>
            <div className={`${StatisticsColors.reportCounts.bg} rounded-lg p-4 text-center`}>
              <div className={`text-2xl font-bold ${StatisticsColors.reportCounts.text}`}>
                {loading ? '...' : userStats.totalReports}
              </div>
              <div className={`text-sm ${StatisticsColors.reportCounts.text}`}>
                Report Counts
              </div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                {user.warningCount || 0}
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                Warnings
              </div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                {loading ? '...' : userStats.totalLikes}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Total Likes
              </div>
            </div>
          </div>

          {/* Posts Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                Posts
              </h4>
              {userPosts.length > 0 && (
                <button 
                  onClick={handleViewAllPosts}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                >
                  View All
                </button>
              )}
            </div>
            
            {userPosts.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  This user doesn't post anything yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userPosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 ${getPostCategoryIndicator(post.category)} rounded-full mt-2`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{post.category}</span>
                         
                        </div>
                        <p className="text-gray-900 dark:text-white text-sm mb-3">
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Posted {formatRelativeTime(post.postDate)}
                          </span>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-purple-600">👍</span>
                              <span className="text-sm text-gray-900 dark:text-white">{post.likes}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-600">👎</span>
                              <span className="text-sm text-gray-900 dark:text-white">{post.dislikes}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-red-600">⚠️</span>
                              <span className="text-sm text-gray-900 dark:text-white">{post.reportCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {userPosts.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                    And {userPosts.length - 3} more posts...
                  </p>
                )}
              </div>
            )}
          </div>



          {/* Action Buttons */}
          <div className="space-y-3">
            {onWarn && (
              <button
                onClick={() => onWarn(user.id)}
                className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${ActionColors.warn}`}
              >
                Warn User
              </button>
            )}
            
            {onBanToggle && (
              user.status === USER_STATUS.BANNED ? (
                <button
                  onClick={() => onBanToggle(user.id, user.status)}
                  className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${ActionColors.unban}`}
                >
                  Unban User
                </button>
              ) : (
                <button
                  onClick={() => onBanToggle(user.id, user.status)}
                  className={`w-full px-4 py-2 rounded-lg transition-colors text-sm font-medium ${ActionColors.ban}`}
                >
                  Ban User
                </button>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* User Posts Drawer */}
      <UserPostsDrawer 
        user={user}
        isOpen={showPostsDrawer}
        onClose={handleCloseDrawers}
        onBack={handleBackToProfile}
      />
    </>
  );
}