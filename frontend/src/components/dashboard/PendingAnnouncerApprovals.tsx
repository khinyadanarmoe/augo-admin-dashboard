import React from "react";
import Link from "next/link";

interface PendingAnnouncer {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  faculty?: string;
}

interface PendingAnnouncerApprovalsProps {
  announcers?: PendingAnnouncer[];
}

export default function PendingAnnouncerApprovals({ announcers }: PendingAnnouncerApprovalsProps) {
  const sampleAnnouncers: PendingAnnouncer[] = [
    {
      id: "1",
      name: "Alice",
      email: "u661212@au.edu",
      organization: "AISEC",
      role: "PR Assistant",
      faculty: "VMES"
    },
    {
     id: "2",
      name: "Alice",
      email: "u661212@au.edu",
      organization: "AISEC",
      role: "PR Assistant",
      faculty: "VMES"
    },
    {
      id: "3",
      name: "Alice",
      email: "u661212@au.edu",
      organization: "AISEC",
      role: "PR Assistant",
      faculty: "VMES"
    },
    {
      id: "4",
      name: "Alice",
      email: "u661212@au.edu",
      organization: "AISEC",
      role: "PR Assistant",
      faculty: "VMES"
    }
  ];

  const displayAnnouncers = announcers || sampleAnnouncers;

  const handleApprove = (id: string) => {
    // Handle approval logic
    console.log('Approving announcer:', id);
  };

  const handleReject = (id: string) => {
    // Handle rejection logic
    console.log('Rejecting announcer:', id);
  };

  const handleViewDetails = (id: string) => {
    // Handle view details logic
    console.log('Viewing details for announcer:', id);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 h-fit">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Announcer Approvals</h3>
        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
          {displayAnnouncers.length} pending
        </span>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {displayAnnouncers.map((announcer) => (
          <div key={announcer.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                    {announcer.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {announcer.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {announcer.role} at {announcer.organization}
                    {announcer.faculty && ` • ${announcer.faculty}`}
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {announcer.email}
            </p>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleApprove(announcer.id)}
                className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
              <button 
                onClick={() => handleReject(announcer.id)}
                className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
              <button 
                onClick={() => handleViewDetails(announcer.id)}
                className="px-2 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-600 rounded hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors"
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {displayAnnouncers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No pending announcer applications</p>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <Link 
          href="/announcers" 
          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          View all announcers →
        </Link>
      </div>
    </div>
  );
}