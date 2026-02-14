import React from "react";

interface PendingAnnouncement {
  id: string;
  title: string;
  content: string;
  author: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  submittedAt: string;
  scheduledFor?: string;
}

interface PendingAnnouncementApprovalsProps {
  announcements?: PendingAnnouncement[];
}

export default function PendingAnnouncementApprovals({ announcements }: PendingAnnouncementApprovalsProps) {
  const sampleAnnouncements: PendingAnnouncement[] = [
    {
      id: "1",
      title: "New Mobile App Update Available",
      content: "We're excited to announce the release of version 2.0 of our mobile application...",
      author: "Mobile Team",
      type: "feature",
      priority: "high",
      submittedAt: "2 hours ago",
      scheduledFor: "Tomorrow 10:00 AM"
    },
    {
      id: "2",
      title: "Server Migration Notice",
      content: "We will be migrating our servers to a new data center this weekend...",
      author: "DevOps Team",
      type: "maintenance",
      priority: "high",
      submittedAt: "5 hours ago",
      scheduledFor: "Friday 11:00 PM"
    },
    {
      id: "3",
      title: "Holiday Schedule Announcement",
      content: "Please note our modified support hours during the upcoming holiday season...",
      author: "Support Team",
      type: "general",
      priority: "medium",
      submittedAt: "1 day ago"
    }
  ];

  // Use provided announcements, or if undefined use samples, but if empty array show empty state
  const displayAnnouncements = announcements !== undefined ? announcements : sampleAnnouncements;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleApprove = (id: string) => {
    // Handle approval logic
    console.log('Approving announcement:', id);
  };

  const handleReject = (id: string) => {
    // Handle rejection logic
    console.log('Rejecting announcement:', id);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Announcement Approvals</h3>
        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
          {displayAnnouncements.length} pending
        </span>
      </div>
      
      <div className="space-y-4">
        {displayAnnouncements.map((announcement) => (
          <div key={announcement.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {announcement.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(announcement.priority)}`}>
                    {announcement.priority} priority
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {announcement.content}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button 
                  onClick={() => handleApprove(announcement.id)}
                  className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleReject(announcement.id)}
                  className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>By {announcement.author}</span>
                <span className="capitalize">{announcement.type}</span>
                <span>Submitted {announcement.submittedAt}</span>
              </div>
              {announcement.scheduledFor && (
                <span>Scheduled for {announcement.scheduledFor}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {displayAnnouncements.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No pending announcements</p>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <a 
          href="/announcements" 
          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          View all announcements →
        </a>
      </div>
    </div>
  );
}