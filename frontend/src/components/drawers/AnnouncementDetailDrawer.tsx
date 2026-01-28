import React from 'react';
import { Announcement } from '@/types/export';

interface AnnouncementDetailDrawerProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (announcementId: string) => void;
  onDelete?: (announcementId: string) => void;
  onApprove?: (announcementId: string) => void;
  onReject?: (announcementId: string) => void;
}

export default function AnnouncementDetailDrawer({ announcement, isOpen, onClose, onEdit, onDelete, onApprove, onReject }: AnnouncementDetailDrawerProps) {
  if (!isOpen || !announcement) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Announcement Details</h2>
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Title and ID */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {announcement.title}
              </h3>
           
            
            </div>
            {announcement.isUrgent && (
              <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full">
                ⚠️ Urgent
              </span>
            )}
          </div>

          {announcement.createdByUID && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created By
                </label>
                <p className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono">
                  Name: {announcement.createdByName || 'N/A'} 
                </p>
                <p className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono">
                  Email: {announcement.createdByEmail || 'N/A'} 
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {announcement.department}
              </p>
            </div>

          {/* Content */}
          <div className="space-y-4">
            {announcement.body && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Body
                </label>
                <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {announcement.body}
                </div>
              </div>
            )}
            
            

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${announcement.status === 'approved' ? 'bg-green-100 text-green-800' : announcement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  {announcement.status}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.startDate.toString())}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.endDate.toString())}
                </p>
              </div>
            </div>

            {announcement.link && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link
                </label>
                <a href={announcement.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline bg-gray-50 dark:bg-gray-700 p-2 rounded block truncate">
                  {announcement.link}
                </a>
              </div>
            )}

            {(announcement.latitude && announcement.longitude) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location (Lat/Long)
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {announcement.latitude.toFixed(5)}, {announcement.longitude.toFixed(5)}
                </p>
              </div>
            )}

            {announcement.views !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Views
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {announcement.views}
                </p>
              </div>
            )}

            
            {announcement.createdByName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created By Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {announcement.createdByName}
                </p>
              </div>
            )}

            {announcement.submittedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Submitted At
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.submittedAt.toString())}
                </p>
              </div>
            )}

            {announcement.rejectedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rejected At
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.rejectedAt.toString())}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {announcement.status === 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                {onApprove && (
                  <button
                    onClick={() => onApprove(announcement.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(announcement.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                )}
              </div>
            )}
            
            {onEdit && (
              <button
                onClick={() => onEdit(announcement.id)}
                className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Edit Announcement
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(announcement.id)}
                className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete Announcement
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}