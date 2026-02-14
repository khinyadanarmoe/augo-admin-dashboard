import React, { useState } from "react";
import { useRouter } from "next/router";

export interface FlaggedUser {
  id: string;
  name: string;
  warningCount: number;
  isBanned: boolean;
  flaggedAt: string; // formatted date string e.g. "10 Nov 2026, 11:00 PM"
  flaggedAtTimestamp: number; // unix ms for filtering
}

interface RecentFlaggedUsersProps {
  users?: FlaggedUser[];
}

type TimePeriod = 7 | 30 | 90;

export default function RecentFlaggedUsers({ users }: RecentFlaggedUsersProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<TimePeriod>(7);

  const allUsers = users || [];

  // Filter users based on selected time period
  const now = Date.now();
  const cutoff = now - period * 24 * 60 * 60 * 1000;
  const filteredUsers = allUsers.filter(u => u.flaggedAtTimestamp >= cutoff);

  const periodLabels: Record<TimePeriod, string> = {
    7: '7 Days',
    30: '30 Days',
    90: '90 Days',
  };

  const handleUserClick = (id: string) => {
    router.push(`/users?id=${id}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Flagged Users
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full">
            {filteredUsers.length}
          </span>
        </div>
        {/* Period Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {([7, 30, 90] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-white dark:bg-gray-600 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-start justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            onClick={() => handleUserClick(user.id)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </span>
                {user.isBanned && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white rounded">
                    Banned
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exceeded warning limit ({user.warningCount})
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {user.flaggedAt}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No flagged users in the last {periodLabels[period].toLowerCase()}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All users are in good standing</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <a
          href="/users"
          className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          View all users →
        </a>
      </div>
    </div>
  );
}
