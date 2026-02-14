import React from "react";
import { useRouter } from "next/router";

interface Report {
  id: string;
  type: string;
  postTitle: string;
  reporter: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reportedAt: string;
}

interface RecentReportsListProps {
  reports?: Report[];
}

export default function RecentReportsList({ reports }: RecentReportsListProps) {
  const router = useRouter();
  const sampleReports: Report[] = [
    {
      id: "1",
      type: "Inappropriate Content",
      postTitle: "Sample Post Title Here",
      reporter: "Anonymous User",
      reason: "Contains offensive language",
      status: "pending",
      reportedAt: "30 minutes ago"
    },
    {
      id: "2",
      type: "Spam",
      postTitle: "Another Sample Post",
      reporter: "User123",
      reason: "Promotional content",
      status: "reviewed",
      reportedAt: "2 hours ago"
    },
    {
      id: "3",
      type: "Misinformation",
      postTitle: "Third Sample Post",
      reporter: "Moderator",
      reason: "False information about health",
      status: "pending",
      reportedAt: "4 hours ago"
    }
  ];

  const displayReports = (reports || sampleReports).filter(r => r.status === 'pending');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'reviewed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleReportClick = (id: string) => {
    router.push(`/reports?id=${id}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Pending Reports</h3>
      
      {displayReports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No pending reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayReports.map((report) => (
          <div 
            key={report.id} 
            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() => handleReportClick(report.id)}
          >
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.type}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                    Post: {report.postTitle}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Reason: {report.reason}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  By {report.reporter}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {report.reportedAt}
                </span>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <a 
          href="/reports" 
          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          View all reports →
        </a>
      </div>
    </div>
  );
}