import React from "react";

interface Post {
  id: string;
  title: string;
  author: string;
  views: number;
  likes: number;
  category: string;
  publishedAt: string;
}

interface TopPostsListProps {
  posts?: Post[];
}

export default function TopPostsList({ posts }: TopPostsListProps) {
  const samplePosts: Post[] = [
    {
      id: "1",
      title: "Getting Started with React Native Development",
      author: "John Doe",
      views: 2450,
      likes: 89,
      category: "Technology",
      publishedAt: "2 hours ago"
    },
    {
      id: "2",
      title: "10 Best Study Tips for University Students",
      author: "Jane Smith",
      views: 1876,
      likes: 156,
      category: "Education",
      publishedAt: "5 hours ago"
    },
    {
      id: "3",
      title: "Myanmar Football League 2024 Season Highlights",
      author: "Sports Admin",
      views: 1543,
      likes: 203,
      category: "Sports",
      publishedAt: "1 day ago"
    },
    {
      id: "4",
      title: "Traditional Myanmar Cuisine Recipe Collection",
      author: "Chef Maya",
      views: 1234,
      likes: 98,
      category: "Food",
      publishedAt: "2 days ago"
    },
    {
      id: "5",
      title: "Complete Guide to Digital Marketing for Beginners",
      author: "Marketing Pro",
      views: 1156,
      likes: 87,
      category: "Business",
      publishedAt: "3 days ago"
    },
    {
      id: "6",
      title: "Best Photography Tips for Social Media",
      author: "Photo Expert",
      views: 1089,
      likes: 145,
      category: "Photography",
      publishedAt: "4 days ago"
    },
    {
      id: "7",
      title: "Understanding AI and Machine Learning Basics",
      author: "Tech Guru",
      views: 987,
      likes: 76,
      category: "Technology",
      publishedAt: "5 days ago"
    },
    {
      id: "8",
      title: "Healthy Lifestyle Tips for Busy Professionals",
      author: "Health Coach",
      views: 923,
      likes: 112,
      category: "Health",
      publishedAt: "6 days ago"
    },
    {
      id: "9",
      title: "Myanmar History: Ancient Kingdoms and Culture",
      author: "History Scholar",
      views: 856,
      likes: 134,
      category: "History",
      publishedAt: "1 week ago"
    },
    {
      id: "10",
      title: "Climate Change Impact on Southeast Asia",
      author: "Environmental Scientist",
      views: 798,
      likes: 91,
      category: "Environment",
      publishedAt: "1 week ago"
    }
  ];

  const displayPosts = posts || samplePosts;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top 10 Posts</h3>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {displayPosts.map((post, index) => (
          <div key={post.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full text-xs font-medium text-purple-600 dark:text-purple-300 shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                {post.title}
              </h4>
              <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>By {post.author}</span>
                <span>•</span>
                <span>{post.category}</span>
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{post.views.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{post.likes}</span>
                </div>
                <span className="text-xs text-gray-400">{post.publishedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <a 
          href="/posts" 
          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          View all posts →
        </a>
      </div>
    </div>
  );
}