import React from "react";

interface TopLocationsChartProps {
  data?: any[];
}

export default function TopLocationsChart({ data }: TopLocationsChartProps) {
  const locations = [
    { name: "MSME", posts: 276, color: "bg-purple-400" },
    { name: "AU Mall", posts: 122, color: "bg-red-400" },
    { name: "VMES", posts: 10, color: "bg-cyan-400" },
    { name: "CL", posts: 34, color: "bg-orange-400" },
    { name: "Art", posts: 317, color: "bg-blue-600" },
  ];

  const maxPosts = Math.max(...locations.map(loc => loc.posts));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Locations</h3>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        {locations.map((location) => (
          <div key={location.name} className="flex items-center gap-2">
            <div className={`w-3 h-3 ${location.color} rounded-sm`}></div>
            <span className="text-gray-600 dark:text-gray-300">{location.name}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex items-center justify-center">
        {/* Y-axis label - minimal space */}
        <div className="flex items-center justify-center w-6 mr-2">
          <span className="text-xs text-gray-600 dark:text-gray-300 transform -rotate-90 whitespace-nowrap">
            Number of Posts
          </span>
        </div>
        
        <div className="flex-1 max-w-4xl space-y-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>0</span>
            <span>40</span>
            <span>80</span>
            <span>120</span>
            <span>160</span>
            <span>200</span>
            <span>240</span>
            <span>280</span>
            <span>320</span>
            <span>360</span>
            <span>400</span>
          </div>
          
          <div className="space-y-4">
            {locations.map((location) => {
              const width = (location.posts / maxPosts) * 100;
              return (
                <div key={location.name} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-100 dark:bg-gray-700 relative">
                      <div 
                        className={`h-8 ${location.color} relative`}
                        style={{ width: `${width}%` }}
                      >
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white min-w-10">
                    {location.posts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}