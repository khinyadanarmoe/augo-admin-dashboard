import React, { useState, useEffect } from "react";
import { Report, REPORT_CATEGORIES, REPORT_STATUS } from "@/types/export";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminConfiguration } from "@/hooks/useAdminConfiguration";
import { useReports } from "@/hooks/useReports";
import { SearchIcon } from "@/components/ui/icons";
import SendNotificationModal from "@/components/SendNotificationModal";
import ReportDetailDrawer from "@/components/drawers/ReportDetailDrawer";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

interface ReportTableProps {
  highlightPostId?: string | null;
  initialSearchTerm?: string;
}

export default function ReportTable({ highlightPostId, initialSearchTerm }: ReportTableProps) {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const { config } = useAdminConfiguration();
  const [user] = useAuthState(auth);
  const { reports, loading: reportsLoading, error, updateStatus } = useReports();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<'reportCount'>('reportCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<Report | null>(null);
  const [showReportDetailDrawer, setShowReportDetailDrawer] = useState(false);

  // Update search term when initialSearchTerm prop changes
  useEffect(() => {
    if (initialSearchTerm !== undefined) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Helper function to determine color based on report count and configuration
  const getReportCountColor = (count: number) => {
    if (!config?.reportThresholds) {
      // Fallback to default values if config not loaded
      return count > 10 ? 'bg-red-500' : count > 5 ? 'bg-yellow-500' : 'bg-green-500';
    }
    
    const { normal, warning, urgent } = config.reportThresholds;
    
    // Color coding based on admin configuration thresholds
    if (count > urgent) {
      return 'bg-red-500'; // Urgent (red)
    } else if (count > warning) {
      return 'bg-yellow-500'; // Warning (yellow)
    } else if (count > normal) {
      return 'bg-orange-500'; // Normal threshold (orange)
    } else {
      return 'bg-green-500'; // Below normal threshold (green)
    }
  };
  // Helper function to safely format dates
  const formatDate = (dateValue: string | any | undefined) => {
    if (!dateValue) {
      return 'Unknown Date';
    }
    
    try {
      let date: Date;
      
      // Handle Firestore Timestamp objects
      if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
        date = dateValue.toDate();
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };
  // Handle loading and authentication states
  if (authLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-2 text-zinc-600 dark:text-zinc-400">
          {authLoading ? 'Authenticating...' : 'Loading reports...'}
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Hook handles redirect
  }

  // Show error state if there's an error loading reports
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">
          <p>Error loading reports: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show message if no reports exist
  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">No reports found</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">
            Reports will appear here when users submit them
          </p>
        </div>
      </div>
    );
  }

  // Filter reports
  const filteredReports = reports.filter(report => {
    return (
      (searchTerm === '' || 
       report.reporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.reported.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.postContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.postId.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === '' || report.category === categoryFilter) &&
      (statusFilter === '' || report.status === statusFilter)
    );
  }).sort((a, b) => {
    return sortOrder === 'asc' ? a.reportCount - b.reportCount : b.reportCount - a.reportCount;
  });

  const totalPages = Math.ceil(filteredReports.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1);
  };

  const handleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getSortIcon = () => {
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      await updateStatus(reportId, newStatus);
    } catch (error) {
      console.error('Failed to update report status:', error);
    }
  };

  const handleSendNotification = (report: Report) => {
    setSelectedReport(report);
    setShowNotificationModal(true);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'offensive': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'spam': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'harassment': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'misinformation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleView = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setSelectedReportForDetail(report);
      setShowReportDetailDrawer(true);
    }
  };

  const handleCloseReportDetail = () => {
    setShowReportDetailDrawer(false);
    setSelectedReportForDetail(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4">
          {/* Search Box */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reporter, reported user, content, description, or post ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="offensive">Offensive Posts</option>
            <option value="spam">Spam Posts</option>
            <option value="harassment">Harassment Cases</option>
            <option value="misinformation">Misinformation</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reporter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reported User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={handleSort} className="flex items-center space-x-1 hover:text-purple-600">
                  <span>Report Count</span>
                  <span>{getSortIcon()}</span>
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedReports.map((report) => {
              const isHighlighted = highlightPostId && report.postId === highlightPostId;
              
              return (
                <tr 
                  key={report.id} 
                  id={`report-${report.postId}`}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500' : ''
                  }`}
                >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatDate(report.reportDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.reporter.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {report.reporter.id}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.reported.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {report.reported.id}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                  <div className="truncate mb-1">
                    {report.postContent}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    ID: {report.postId}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(report.category)}`}>
                    {report.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <span className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${getReportCountColor(report.reportCount)}`}></span>
                    {report.reportCount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-2">

                    {/* View Details Button */}
                    <button 
                      onClick={() => handleView(report.id)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1"
                      title="View Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>

                    {/* Send Notification Button */}
                    <button 
                      onClick={() => handleSendNotification(report)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs transition-colors"
                      title="Send Notification"
                    >
                      Warn
                    </button>

                    {/* Status Update Dropdown */}
                    <select
                      value={report.status}
                      onChange={(e) => handleStatusChange(report.id, e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                    

                    

                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <span>Rows per page</span>
            <select 
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              className="mx-2 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>{startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredReports.length)} of {filteredReports.length} rows</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded ${
                    currentPage === page
                      ? 'bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2">...</span>
                <button 
                  onClick={() => handlePageChange(totalPages)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button 
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Send Notification Modal */}
      {showNotificationModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Send Notification to User
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Reported User: {selectedReport.reported.name} ({selectedReport.reported.id})
              </p>
            </div>
            <div className="p-4">
              <SendNotificationModal
                userId={selectedReport.reported.id}
                adminId={user?.uid || 'admin'}
                relatedPostId={selectedReport.postId}
                onNotificationSent={(notificationId) => {
                  alert(`Notification sent successfully! ID: ${notificationId}`);
                  setShowNotificationModal(false);
                  setSelectedReport(null);
                }}
              />
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setSelectedReport(null);
                }}
                className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Drawer */}
      <ReportDetailDrawer
        report={selectedReportForDetail}
        isOpen={showReportDetailDrawer}
        onClose={handleCloseReportDetail}
      />
    </div>
  );
}