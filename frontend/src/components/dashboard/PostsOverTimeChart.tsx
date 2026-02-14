import React, { useMemo } from "react";
import { LineChart } from '@mui/x-charts/LineChart';

interface PostTimeData {
  date: string;
  count: number;
}

export type TimeRange = '7 Days' | '30 Days' | '90 Days';

interface PostsOverTimeChartProps {
  data?: PostTimeData[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

const TIME_RANGES: TimeRange[] = ['7 Days', '30 Days', '90 Days'];

export default function PostsOverTimeChart({ 
  data = [], 
  timeRange = "7 Days", 
  onTimeRangeChange 
}: PostsOverTimeChartProps) {
  
  const totalPosts = useMemo(() => 
    data.reduce((sum, item) => sum + item.count, 0)
  , [data]);

  const peakData = useMemo(() => {
    if (data.length === 0) return null;
    return data.reduce((max, item) => item.count > max.count ? item : max, data[0]);
  }, [data]);

  // Calculate trend using linear regression
  const trendInfo = useMemo(() => {
    if (data.length < 2) return null;
    
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.count, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.count, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate trend line data points
    const trendData = data.map((_, i) => slope * i + intercept);
    
    return { slope, trendData };
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // X-axis labels
  const xLabels = useMemo(() => 
    data.map(d => formatDate(d.date))
  , [data]);

  // Y-axis data (post counts)
  const yData = useMemo(() => 
    data.map(d => d.count)
  , [data]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Posts Over Time</h3>
          {data.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalPosts} total posts
            </p>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange?.(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === range
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No post data available</p>
          </div>
        ) : (
          <LineChart
            xAxis={[{ 
              data: xLabels,
              scaleType: 'point',
              tickLabelStyle: {
                fontSize: 10,
                fill: '#9ca3af'
              }
            }]}
            yAxis={[{
              tickLabelStyle: {
                fontSize: 10,
                fill: '#9ca3af'
              }
            }]}
            series={[
              {
                data: yData,
                label: 'Posts',
                color: '#a855f7',
                curve: 'linear',
                showMark: true,
                area: true,
              },
              ...(trendInfo ? [{
                data: trendInfo.trendData,
                label: 'Trend',
                color: '#c084fc',
                curve: 'linear' as const,
                showMark: false,
              }] : [])
            ]}
            height={220}
            margin={{ top: 20, bottom: 30, left: 40, right: 20 }}
            hideLegend
            sx={{
              '& .MuiLineElement-root': {
                strokeWidth: 2,
              },
              '& .MuiAreaElement-root': {
                fillOpacity: 0.1,
              },
              '& .MuiMarkElement-root': {
                stroke: '#a855f7',
                fill: '#ffffff',
                strokeWidth: 2,
              },
              '& .MuiChartsAxis-line': {
                stroke: '#e5e7eb',
              },
              '& .MuiChartsAxis-tick': {
                stroke: '#e5e7eb',
              },
            }}
          />
        )}
      </div>
      
      {/* Footer stats */}
      {data.length > 0 && (
        <div className="mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {peakData && peakData.count > 0 && (
                <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Peak: <span className="font-medium text-gray-900 dark:text-white">{peakData.count} posts</span>
                  on {formatDate(peakData.date)}
                </span>
              )}
            </div>
            {trendInfo && (
              <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                <span className="w-4 h-0 border-t-2 border-dashed border-purple-400"></span>
                Trend: 
                <span className={`font-medium ${trendInfo.slope > 0 ? 'text-green-600 dark:text-green-400' : trendInfo.slope < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {trendInfo.slope > 0 ? '↑ Rising' : trendInfo.slope < 0 ? '↓ Declining' : '→ Stable'}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}