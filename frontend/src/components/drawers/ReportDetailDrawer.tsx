import React, { useState } from "react";
import {
  Report,
  REPORT_STATUS,
  USER_STATUS,
  POST_STATUS,
  CATEGORY_SEVERITY_MAP,
  CATEGORY_LABELS,
  REPORT_SEVERITY,
} from "@/types/export";
import { User } from "@/types";
import {
  fetchUserById,
  incrementUserWarningCount,
  updateUserStatus,
} from "@/lib/firestore/users";
import {
  updatePostStatus,
  updatePostWarningStatus,
} from "@/lib/firestore/posts";
import {
  updateReportStatus,
  resolveReportsByPostId,
} from "@/lib/firestore/reports";
import { sendWarningNotificationToUser } from "@/lib/firestore/notifications";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useAdminConfiguration } from "@/hooks/useAdminConfiguration";
import UserDetailDrawer from "./UserDetailDrawer";

interface ReportDetailDrawerProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve?: (reportId: string) => void;
  onReject?: (reportId: string) => void;
}

export default function ReportDetailDrawer({
  report,
  isOpen,
  onClose,
  onResolve,
  onReject,
}: ReportDetailDrawerProps) {
  const [authUser] = useAuthState(auth);
  const { config } = useAdminConfiguration();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [dismissingReport, setDismissingReport] = useState(false);
  const [reportDismissed, setReportDismissed] = useState(false);

  // Confirmation modal state for remove & warn
  const [showRemoveWarnModal, setShowRemoveWarnModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  if (!isOpen || !report) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case REPORT_STATUS.PENDING:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case REPORT_STATUS.RESOLVED:
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryColor = (category: string) => {
    const severity =
      CATEGORY_SEVERITY_MAP[category as keyof typeof CATEGORY_SEVERITY_MAP];

    switch (severity) {
      case REPORT_SEVERITY.HIGH:
        return "bg-red-100 text-red-800";
      case REPORT_SEVERITY.MEDIUM:
        return "bg-yellow-100 text-yellow-800";
      case REPORT_SEVERITY.LOW:
        return "bg-green-100 text-green-800";
      case REPORT_SEVERITY.OTHER:
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryLabel = (category: string) => {
    return (
      CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
    );
  };

  // Handle remove post and warn user confirmation
  const handleRemoveAndWarnClick = () => {
    setShowRemoveWarnModal(true);
  };

  // Confirm post removal and warning
  const confirmPostRemovalAndWarning = async () => {
    if (!report.postId || !report.reported.id || !authUser) return;

    setProcessing(true);
    try {
      // Update post status to removed
      await updatePostStatus(report.postId, POST_STATUS.REMOVED);

      // Set post as warned
      await updatePostWarningStatus(report.postId, true);

      // Warning user: increment warning count
      await incrementUserWarningCount(report.reported.id);

      // Update user status to warning (if not suspended or banned)
      const user = await fetchUserById(report.reported.id);
      if (
        user &&
        user.status !== USER_STATUS.SUSPENDED &&
        user.status !== USER_STATUS.BANNED
      ) {
        await updateUserStatus(report.reported.id, USER_STATUS.WARNING);
      }

      // Send warning notification
      await sendWarningNotificationToUser(
        report.reported.id,
        report.postId,
        authUser.uid,
      );

      // Auto-resolve all related reports since post is warned
      await resolveReportsByPostId(report.postId);

      setActionCompleted(true);
      setShowRemoveWarnModal(false);
    } catch (error) {
      console.error("Failed to handle post removal and warning:", error);
    } finally {
      setProcessing(false);
    }
  };
  // Handle dismissing report
  const handleDismissReport = async () => {
    if (!report.id) return;
    setDismissingReport(true);
    try {
      await updateReportStatus(report.id, "dismissed");
      setReportDismissed(true);
    } catch (error) {
      console.error("Error dismissing report:", error);
    } finally {
      setDismissingReport(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle viewing user details
  const handleViewUser = async (userId: string) => {
    if (!userId) return;
    setLoadingUserId(userId);
    try {
      const fullUser = await fetchUserById(userId);
      if (fullUser) {
        setSelectedUser(fullUser);
        setIsUserDrawerOpen(true);
      } else {
        console.error("User not found");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleCloseUserDrawer = () => {
    setIsUserDrawerOpen(false);
    setSelectedUser(null);
  };

  // Handle warning user from user detail drawer
  const handleUserWarn = async (userId: string) => {
    try {
      await incrementUserWarningCount(userId);
      if (
        selectedUser &&
        selectedUser.status !== USER_STATUS.SUSPENDED &&
        selectedUser.status !== USER_STATUS.BANNED
      ) {
        await updateUserStatus(userId, USER_STATUS.WARNING);
        const updatedUser = await fetchUserById(userId);
        if (updatedUser) setSelectedUser(updatedUser);
      }
    } catch (error) {
      console.error("Error warning user:", error);
    }
  };

  // Handle suspend/unsuspend toggle from user detail drawer
  const handleUserSuspendToggle = async (
    userId: string,
    currentStatus: string,
  ) => {
    try {
      const newStatus =
        currentStatus === USER_STATUS.SUSPENDED
          ? USER_STATUS.ACTIVE
          : USER_STATUS.SUSPENDED;
      await updateUserStatus(
        userId,
        newStatus,
        config?.suspendDurationDays || 30,
      );
      const updatedUser = await fetchUserById(userId);
      if (updatedUser) setSelectedUser(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const ViewButton = ({ userId }: { userId: string }) => (
    <button
      onClick={() => handleViewUser(userId)}
      disabled={loadingUserId === userId}
      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-1"
    >
      {loadingUserId === userId ? (
        <>
          <svg
            className="w-3 h-3 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <span>View</span>
      )}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-125 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Report Details
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
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Post ID */}
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ID: {report.id}
            </span>
          </div>

          {/* Status and Reason in same row */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Status:
              </span>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(report.status)}`}
              >
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason:
              </span>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(report.category)}`}
              >
                {getCategoryLabel(report.category)}
              </span>
            </div>
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
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="text-sm text-gray-900 dark:text-white">
                  {report.reporter.name}
                </span>
                <ViewButton userId={report.reporter.id} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reported User
              </label>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="text-sm text-gray-900 dark:text-white">
                  {report.reported.name}
                </span>
                <ViewButton userId={report.reported.id} />
              </div>
            </div>

            {/* Post Content if available */}
            {report.postContent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reported Post Content
                </label>
                <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                  {report.postContent}
                </div>
              </div>
            )}

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

          {/* Remove Post & Warn User - Combined Action */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleRemoveAndWarnClick}
              disabled={
                actionCompleted ||
                processing ||
                report.status !== REPORT_STATUS.PENDING
              }
              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                actionCompleted || report.status !== REPORT_STATUS.PENDING
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
                  : "text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 dark:text-red-300 dark:bg-red-900/30 dark:border-red-800 dark:hover:bg-red-900/50"
              }`}
            >
              {processing ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : actionCompleted ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Action Completed</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span>Remove Post & Warn User</span>
                </>
              )}
            </button>

            <button
              onClick={handleDismissReport}
              disabled={
                reportDismissed ||
                dismissingReport ||
                report.status !== "pending"
              }
              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center ${
                reportDismissed || report.status !== "pending"
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600"
                  : "text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
              }`}
            >
              {dismissingReport
                ? "Dismissing..."
                : reportDismissed
                  ? "Report Dismissed"
                  : "Dismiss the report"}
            </button>
          </div>
        </div>
      </div>

      {/* Remove & Warn Confirmation Modal */}
      {showRemoveWarnModal && (
        <>
          {/* Modal backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
            onClick={() => {
              setShowRemoveWarnModal(false);
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Confirm Action
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This action will remove the post and warn the user
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Are you sure you want to <strong>remove the post</strong>{" "}
                    and <strong>warn the user {report.reported.name}</strong>?
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Reported content:
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                      "{report.postContent}"
                    </p>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                      ⚠️ This action will:
                    </p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      <li>• Remove the post from public view</li>
                      <li>• Send a warning notification to the user</li>
                      <li>• Automatically resolve this report</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowRemoveWarnModal(false);
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPostRemovalAndWarning}
                    disabled={processing}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {processing ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <span>Confirm</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        isOpen={isUserDrawerOpen}
        onClose={handleCloseUserDrawer}
        onWarn={handleUserWarn}
        onSuspendToggle={handleUserSuspendToggle}
      />
    </>
  );
}
