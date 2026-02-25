import React, { useState, useEffect } from "react";
import { Announcer, Announcement } from "@/types/export";
import { useStorageUrl } from "@/lib/storageUtils";
import { fetchAnnouncements } from "@/lib/firestore/announcements";

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
  onEdit,
}: AnnouncerDetailDrawerProps) {
  const [recentAnnouncements, setRecentAnnouncements] = useState<
    Announcement[]
  >([]);
  const [activeAnnouncementsCount, setActiveAnnouncementsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load profile picture from Firebase Storage (must be before conditional return)
  const { url: profileUrl } = useStorageUrl(announcer?.profilePicture || "");

  if (!isOpen || !announcer) return null;

  // Fetch announcer's announcements
  useEffect(() => {
    const loadAnnouncerAnnouncements = async () => {
      if (!announcer?.id) return;

      setLoading(true);
      try {
        const allAnnouncements = await fetchAnnouncements();

        // Filter announcements by this announcer
        const announcerAnnouncements = allAnnouncements.filter(
          (announcement) => announcement.createdByUID === announcer.id,
        );

        // Get active announcements count
        const activeCount = announcerAnnouncements.filter(
          (announcement) =>
            announcement.status === "active" ||
            announcement.status === "scheduled",
        ).length;
        setActiveAnnouncementsCount(activeCount);

        // Get recent 3 announcements sorted by submission date
        const recentThree = announcerAnnouncements
          .sort((a, b) => {
            const dateA = new Date(a.submittedAt || a.startDate).getTime();
            const dateB = new Date(b.submittedAt || b.startDate).getTime();
            return dateB - dateA;
          })
          .slice(0, 3);

        setRecentAnnouncements(recentThree);
      } catch (error) {
        console.error("Error loading announcer's announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && announcer) {
      loadAnnouncerAnnouncements();
    }
  }, [announcer, isOpen]);

  const formatRelativeTime = (dateString: string | Date) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4)
      return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "expired":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-125 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Announcer Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Announcer Avatar and Basic Info - Left-Right Layout */}
          <div className="flex items-center space-x-4 mb-4">
            {/* Profile Picture - Left Side */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center overflow-hidden">
                {profileUrl ? (
                  <img
                    src={profileUrl}
                    alt={announcer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-300">
                    {announcer.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
              </div>
              {/* Status Indicator */}
              <div
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                  announcer.status === "active"
                    ? "bg-green-500"
                    : announcer.status === "inactive"
                      ? "bg-gray-500"
                      : announcer.status === "pending"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                }`}
              ></div>
            </div>

            {/* Announcer Info - Right Side */}
            <div className="flex-1 min-w-0 h-20 flex flex-col justify-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {announcer.name}
              </h3>

              {/* Basic Details */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Join Date:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(announcer.joined_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Email:
                  </span>
                  <span className="text-gray-900 dark:text-white text-right truncate max-w-50">
                    {announcer.email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Affiliation:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {announcer.affiliation_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="text-gray-900 dark:text-white">
                  {announcer.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="text-gray-900 dark:text-white">
                  {announcer.affiliation_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Total Announcements:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {announcer.total_announcements}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Status:
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(announcer.status)}`}
                >
                  {announcer.status}
                </span>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {announcer.total_announcements}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Total Announcements
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeAnnouncementsCount}
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
              {recentAnnouncements.length > 0 && (
                <span className="text-sm text-purple-600 dark:text-purple-400">
                  {recentAnnouncements.length} recent
                </span>
              )}
            </div>

            {loading ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Loading announcements...
                </p>
              </div>
            ) : recentAnnouncements.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent announcements found.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {announcement.department}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(announcement.status)}`}
                          >
                            {announcement.status}
                          </span>
                        </div>
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                          {announcement.title}
                        </h5>
                        {announcement.body && (
                          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                            {announcement.body}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(
                              announcement.submittedAt ||
                                announcement.startDate,
                            )}
                          </span>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-purple-600">👁️</span>
                              <span className="text-sm text-gray-900 dark:text-white">
                                {announcement.views || 0}
                              </span>
                            </div>
                            {announcement.isUrgent && (
                              <span className="text-red-500 text-xs font-medium">
                                Urgent
                              </span>
                            )}
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

            {onStatusToggle &&
              (announcer.status === "active" ? (
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
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
