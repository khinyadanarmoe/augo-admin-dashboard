import React from 'react';
import { Announcer } from '@/types/export';

interface AnnouncerDetailDrawerProps {
  announcer: Announcer | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusToggle?: (announcerId: string, currentStatus: string) => void;
  onEdit?: (announcerId: string) => void;
}

export default function AnnouncersDetailDrawer({ 
  announcer, 
  isOpen, 
  onClose, 
  onStatusToggle, 
  onEdit 
}: AnnouncerDetailDrawerProps) {
  if (!isOpen || !announcer) return null;

  // Mock data for demonstration - in real app, this would come from props or API
  const mockAnnouncerProfile = {
    totalAnnouncements: announcer.total_announcements,
    activeAnnouncements: Math.floor(announcer.total_announcements * 0.7),
    joinDate: announcer.joined_date,
    email: announcer.email,
    role: 'Public Relations Officer',
    recentAnnouncements: [
      {
        id: 1,
        title: "Student Registration for Spring 2025",
        content: "Registration for Spring semester will begin on January 15, 2025. Please prepare your documents in advance.",
        category: "Academic",
        postedDate: "2 days ago",
        views: 245,
        engagements: 18
      },
      {
        id: 2,
        title: "Campus Safety Reminder",
        content: "Please remember to carry your student ID at all times and report any suspicious activities to security.",
        category: "Safety",
        postedDate: "5 days ago",
        views: 189,
        engagements: 12
      },
      {
        id: 3,
        title: "Library Extended Hours",
        content: "The library will extend its hours during finals week. Open 24/7 from December 10-20.",
        category: "Facility",
        postedDate: "1 week ago",
        views: 156,
        engagements: 8
      }
    ]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIndicator = (category: string) => {
    switch (category) {
      case 'Academic':
        return 'bg-blue-500';
      case 'Safety':
        return 'bg-red-500';
      case 'Facility':
        return 'bg-green-500';
      case 'Event':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Announcer Profile</h2>
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
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Announcer Avatar and Basic Info - Left-Right Layout */}
          <div className="flex items-center space-x-4 mb-4">
            {/* Profile Picture - Left Side */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600 dark:text-purple-300">
                  {announcer.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              {/* Status Indicator */}
              <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                announcer.status === 'active' ? 'bg-green-500' : 
                announcer.status === 'inactive' ? 'bg-gray-500' :
                announcer.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            
            {/* Announcer Info - Right Side */}
            <div className="flex-1 min-w-0 h-20 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {announcer.name}
              </h3>
              
              {/* Basic Details */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Join Date:</span>
                  <span className="text-gray-900 dark:text-white">{new Date(mockAnnouncerProfile.joinDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span>
                  <span className="text-gray-900 dark:text-white text-right truncate max-w-[200px]">{mockAnnouncerProfile.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Affiliation:</span>
                  <span className="text-gray-900 dark:text-white">{announcer.affiliation_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="text-gray-900 dark:text-white">{announcer.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="text-gray-900 dark:text-white">{announcer.affiliation_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Announcements:</span>
                <span className="text-gray-900 dark:text-white">{announcer.total_announcements}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(announcer.status)}`}>
                  {announcer.status}
                </span>
              </div>

            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {mockAnnouncerProfile.totalAnnouncements}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Total Announcements
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {mockAnnouncerProfile.activeAnnouncements}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Active Announcements
              </div>
            </div>
          </div>

          {/* Recent Announcements Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                Recent Announcements
              </h4>
              {mockAnnouncerProfile.recentAnnouncements.length > 0 && (
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  {mockAnnouncerProfile.recentAnnouncements.length} recent
                </span>
              )}
            </div>
            
            {mockAnnouncerProfile.recentAnnouncements.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent announcements found.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockAnnouncerProfile.recentAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 ${getCategoryIndicator(announcement.category)} rounded-full mt-2`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{announcement.category}</span>
                        </div>
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {announcement.title}
                        </h5>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                          {announcement.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Posted {announcement.postedDate}
                          </span>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-purple-600">👁️</span>
                              <span className="text-sm text-gray-900 dark:text-white">{announcement.views}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-blue-600">💬</span>
                              <span className="text-sm text-gray-900 dark:text-white">{announcement.engagements}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {onEdit && (
              <button
                onClick={() => onEdit(announcer.id)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Edit Announcer
              </button>
            )}
            
            {onStatusToggle && (
              announcer.status === 'active' ? (
                <button
                  onClick={() => onStatusToggle(announcer.id, announcer.status)}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Deactivate Announcer
                </button>
              ) : (
                <button
                  onClick={() => onStatusToggle(announcer.id, announcer.status)}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Activate Announcer
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
