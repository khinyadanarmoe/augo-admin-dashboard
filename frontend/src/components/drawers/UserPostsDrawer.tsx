import React, { useState, useEffect } from 'react';
import { User, getPostCategoryIndicator } from '@/types/export';
import { Post } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';


interface UserPostsDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function UserPostsDrawer({ user, isOpen, onClose, onBack }: UserPostsDrawerProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user posts from Firebase
  const fetchUserPosts = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch posts by user
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      
      const postsSnapshot = await getDocs(postsQuery);
      const fetchedPosts: Post[] = [];
      
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
          postDate: data.date?.toDate ? data.date.toDate().toISOString() : 
                   (data.postDate || new Date().toISOString()),
          category: data.category || 'General',
          location: data.location || 'Campus',
          likes: data.likeCount || data.likes || 0,
          dislikes: data.dislikeCount || data.dislikes || 0,
          reportCount: data.reportCount || data.reports || 0,
          status: data.status || 'active',
          isWarned: data.isWarned || false
        };
        fetchedPosts.push(post);
      }
      
      // Sort posts by date (most recent first)
      fetchedPosts.sort((a, b) => new Date(b.postDate).getTime() - new Date(a.postDate).getTime());
      
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setError('Failed to load user posts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts when user changes and drawer is open
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserPosts(user.id);
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        const days = Math.floor(diffInHours / 24);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
      }
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-125 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Posts</h2>
          </div>
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
          {/* User Info Header */}
          <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
                {user.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{posts.length} posts total</p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <span className="ml-2 text-zinc-600 dark:text-zinc-400">Loading posts...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => user?.id && fetchUserPosts(user.id)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* No Posts State */}
          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No posts found for this user.</p>
            </div>
          )}

          {/* All Posts List */}
          {!loading && !error && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className={`relative rounded-lg border p-4 ${
                  post.status === 'removed' || post.status === 'expired'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}>
                {/* Status Badge */}
                {(post.status === 'removed' || post.status === 'expired') && (
                  <div className="absolute top-3 right-3">
                    <span className={`text-white text-xs font-medium px-2 py-1 rounded ${
                      post.status === 'removed' ? 'bg-red-600' : 'bg-yellow-600'
                    }`}>
                      {post.status === 'removed' ? 'REMOVED' : 'EXPIRED'}
                    </span>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  {/* Category Indicator */}
                  <div className={`w-3 h-3 ${getPostCategoryIndicator(post.category)} rounded-full mt-2 shrink-0`}></div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Category */}
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{post.category}</span>
                    </div>

                    {/* Post Content */}
                    <div className={`text-sm mb-3 whitespace-pre-wrap wrap-break-word ${
                      post.status === 'removed' || post.status === 'expired'
                        ? 'text-red-600 dark:text-red-400 italic' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {post.content}
                    </div>

                    {/* Post Stats and Date */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Posted {formatDate(post.postDate)}
                      </span>
                      
                      {/* Engagement Stats */}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
