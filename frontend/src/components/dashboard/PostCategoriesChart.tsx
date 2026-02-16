import React from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import { POST_CATEGORIES } from "@/types/constants";

interface PostCategory {
  name: string;
  count: number;
  color: string;
}

interface PostCategoriesChartProps {
  data?: PostCategory[];
}

// Category colors mapping - matching all POST_CATEGORIES
const CATEGORY_COLORS: Record<string, string> = {
  [POST_CATEGORIES.CAMPUS_LIFE]: "#3B82F6", // Blue
  [POST_CATEGORIES.CASUAL]: "#10B981", // Green
  [POST_CATEGORIES.LOST_AND_FOUND]: "#F59E0B", // Amber
  [POST_CATEGORIES.COMPLAINTS]: "#EF4444", // Red
  [POST_CATEGORIES.SAFETY]: "#DC2626", // Dark Red
  [POST_CATEGORIES.ACADEMIC]: "#8B5CF6", // Purple
  [POST_CATEGORIES.EVENT]: "#EC4899", // Pink
  [POST_CATEGORIES.OTHER]: "#6B7280", // Gray
};

export default function PostCategoriesChart({
  data,
}: PostCategoriesChartProps) {
  const defaultCategories: PostCategory[] = Object.values(POST_CATEGORIES).map(
    (categoryName) => ({
      name: categoryName,
      count: 0,
      color: CATEGORY_COLORS[categoryName] || "#6B7280",
    }),
  );

  const categories = data && data.length > 0 ? data : defaultCategories;
  const total = categories.reduce((sum, cat) => sum + cat.count, 0);

  // Filter out categories with 0 count for the pie chart
  const chartData = categories
    .filter((cat) => cat.count > 0)
    .map((category, index) => ({
      id: index,
      value: category.count,
      label: category.name,
      color: category.color,
    }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-center h-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Post Categories
      </h3>

      {total === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No posts yet</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="shrink-0">
              <PieChart
                series={[
                  {
                    data: chartData,
                    highlightScope: { fade: "global", highlight: "item" },
                  },
                ]}
                width={360}
                height={360}
                margin={{ top: 10, bottom: 5, left: 10, right: 10 }}
                slots={{
                  legend: () => null,
                }}
              />
            </div>

            <div className="flex-1 space-y-3">
              {categories
                .filter((cat) => cat.count > 0)
                .map((category) => {
                  const percentage =
                    total > 0
                      ? ((category.count / total) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <div
                      key={category.name}
                      className="flex items-center gap-4"
                    >
                      <div className="flex items-center space-x-3 min-w-30">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
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
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 w-full text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Posts:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
