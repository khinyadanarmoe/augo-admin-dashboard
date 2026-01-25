import React from 'react';
import { Report, REPORT_STATUS } from '@/types/export';

interface ReportDetailDrawerProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (reportId: string) => void;
  onReject?: (reportId: string) => void;
}

export default function ReportDetailDrawer({ report, isOpen, onClose, onResolve, onReject }: ReportDetailDrawerProps) {
  if (!isOpen || !report) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case REPORT_STATUS.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case REPORT_STATUS.RESOLVED: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'offensive': 'bg-red-100 text-red-800',
      'spam': 'bg-orange-100 text-orange-800',
      'harassment': 'bg-purple-100 text-purple-800',
      'misinformation': 'bg-blue-100 text-blue-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Report Details</h2>
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
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status and Category */}
          <div className="flex justify-between items-start">
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(report.status)}`}>
              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ID: {report.id}
            </span>
          </div>

          <div>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(report.category)}`}>
              {report.category.charAt(0).toUpperCase() + report.category.slice(1)}
            </span>
          </div>

          {/* Report Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                {report.description}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reporter
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {report.reporter.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reported User/Content
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {report.reported.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Date
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {formatDate(report.reportDate)}
              </p>
            </div>
          </div>

          {/* Actions */}
          {report.status === REPORT_STATUS.PENDING && (
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {onResolve && (
                <button
                  onClick={() => onResolve(report.id)}
                  className="w-full px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Mark as Resolved
                </button>
              )}
              
              {onReject && (
                <button
                  onClick={() => onReject(report.id)}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Reject Report
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}