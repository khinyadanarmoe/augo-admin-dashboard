import React from "react";

interface UserActivityChartProps {
  data?: any[];
  timeRange?: string;
}

export default function UserActivityChart({ data, timeRange = "7 Days" }: UserActivityChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Activity</h3>
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-purple-500 text-white text-sm rounded-md">
            {timeRange}
          </button>
          <button className="px-3 py-1 text-gray-600 dark:text-gray-400 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            30 Days
          </button>
          <button className="px-3 py-1 text-gray-600 dark:text-gray-400 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            90 Days
          </button>
        </div>
      </div>
      
      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Chart will be implemented here</p>
      </div>
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Peak activity: 2,847 users at 2:00 PM</p>
      </div>
    </div>
  );
}