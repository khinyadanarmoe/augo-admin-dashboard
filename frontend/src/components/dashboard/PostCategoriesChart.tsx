import React from "react";

interface PostCategory {
  name: string;
  count: number;
  color: string;
}

interface PostCategoriesChartProps {
  data?: PostCategory[];
}

export default function PostCategoriesChart({ data }: PostCategoriesChartProps) {
  const defaultCategories: PostCategory[] = [
    { name: "Casual", count: 0, color: "bg-blue-500" },
    { name: "Announcements", count: 0, color: "bg-green-500" },
    { name: "Events", count: 0, color: "bg-yellow-500" },
    { name: "Lost and Found", count: 0, color: "bg-purple-500" },
    { name: "Complaints", count: 0, color: "bg-gray-500" },
  ];

  const categories = data && data.length > 0 ? data : defaultCategories;
  const total = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Post Categories</h3>
      
      {total === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {categories.map((category) => {
              const percentage = total > 0 ? ((category.count / total) * 100).toFixed(1) : '0.0';
              return (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {category.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Posts: <span className="font-medium text-gray-900 dark:text-white">{total.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}