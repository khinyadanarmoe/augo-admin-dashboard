import React from "react";
import { useRouter } from "next/router";

interface Post {
  id: string;
  title: string;
  author: string;
  likes: number;
  dislikes: number;
  category: string;
  publishedAt: string;
}

interface TopPostsListProps {
  posts?: Post[];
}

export default function TopPostsList({ posts }: TopPostsListProps) {
  const router = useRouter();
  const samplePosts: Post[] = [
    {
      id: "1",
      title: "Getting Started with React Native Development",
      author: "John Doe",
      likes: 89,
      dislikes: 12,
      category: "Technology",
      publishedAt: "2 hours ago",
    },
    {
      id: "2",
      title: "10 Best Study Tips for University Students",
      author: "Jane Smith",
      likes: 156,
      dislikes: 23,
      category: "Education",
      publishedAt: "5 hours ago",
    },
    {
      id: "3",
      title: "Myanmar Football League 2024 Season Highlights",
      author: "Sports Admin",
      likes: 203,
      dislikes: 15,
      category: "Sports",
      publishedAt: "1 day ago",
    },
    {
      id: "4",
      title: "Traditional Myanmar Cuisine Recipe Collection",
      author: "Chef Maya",
      likes: 98,
      dislikes: 8,
      category: "Food",
      publishedAt: "2 days ago",
    },
    {
      id: "5",
      title: "Complete Guide to Digital Marketing for Beginners",
      author: "Marketing Pro",
      likes: 87,
      dislikes: 5,
      category: "Business",
      publishedAt: "3 days ago",
    },
    {
      id: "6",
      title: "Best Photography Tips for Social Media",
      author: "Photo Expert",
      likes: 145,
      dislikes: 18,
      category: "Photography",
      publishedAt: "4 days ago",
    },
    {
      id: "7",
      title: "Understanding AI and Machine Learning Basics",
      author: "Tech Guru",
      likes: 76,
      dislikes: 9,
      category: "Technology",
      publishedAt: "5 days ago",
    },
    {
      id: "8",
      title: "Healthy Lifestyle Tips for Busy Professionals",
      author: "Health Coach",
      likes: 112,
      dislikes: 14,
      category: "Health",
      publishedAt: "6 days ago",
    },
    {
      id: "9",
      title: "Myanmar History: Ancient Kingdoms and Culture",
      author: "History Scholar",
      likes: 134,
      dislikes: 7,
      category: "History",
      publishedAt: "1 week ago",
    },
    {
      id: "10",
      title: "Climate Change Impact on Southeast Asia",
      author: "Environmental Scientist",
      likes: 91,
      dislikes: 11,
      category: "Environment",
      publishedAt: "1 week ago",
    },
  ];

  const displayPosts = (posts || samplePosts)
    .slice()
    .sort((a, b) => b.likes - a.likes);

  const handlePostClick = (id: string) => {
    router.push(`/posts?id=${id}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 h-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Top 10 Posts by Likes
      </h3>

      {displayPosts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {displayPosts.map((post, index) => (
            <div
              key={post.id}
              className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => handlePostClick(post.id)}
            >
              <div className="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full text-xs font-medium text-purple-600 dark:text-purple-300 shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                  {post.title}
                </h4>
                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>By {post.author}</span>
                  <span>•</span>
                  <span>{post.category}</span>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ⇧{post.likes}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ⇩{post.dislikes}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {post.publishedAt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
