import React, { useEffect, useState } from "react";
import { Post, POST_STATUS, USER_STATUS } from "@/types/export";
import { User } from "@/types";
import { useAdminConfiguration } from "@/hooks/useAdminConfiguration";
import { sendWarningNotificationToUser } from "@/lib/firestore/notifications";
import {
  incrementUserWarningCount,
  fetchUserById,
  updateUserStatus,
} from "@/lib/firestore/users";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import UserDetailDrawer from "./UserDetailDrawer";

interface PostDetailDrawerProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onWarn?: (postId: string) => void;
  onRemove?: (postId: string) => void;
}

export default function PostDetailDrawer({
  post,
  isOpen,
  onClose,
  onWarn,
  onRemove,
}: PostDetailDrawerProps) {
  const { config, loading: configLoading } = useAdminConfiguration();
  const [user] = useAuthState(auth);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  if (!isOpen || !post) return null;

  // Check if post should be warned based on admin configuration
  const shouldShowWarning =
    config && post.reportCount >= (config.reportThresholds?.urgent || 5);
  const canWarn =
    onWarn &&
    post.status !== POST_STATUS.EXPIRED &&
    post.status !== POST_STATUS.REMOVED;

  // Show confirmation modal first
  const handleWarn = () => {
    setShowConfirmModal(true);
  };

  // Actually execute the warning after confirmation
  const confirmWarn = async () => {
    if (!onWarn || !post || !user) return;

    try {
      // First update the post status
      onWarn(post.id);

      // Then send notification to the user
      await sendWarningNotificationToUser(post.user.id, post.id, user.uid);

      // Increment user warning count
      await incrementUserWarningCount(post.user.id);

      console.log(
        "Warning notification sent to user and warning count incremented:",
        post.user.id,
      );
      setShowConfirmModal(false);
    } catch (error) {
      console.error(
        "Error sending warning notification or incrementing warning count:",
        error,
      );
      // Still proceed with the warning even if notification/increment fails
      setShowConfirmModal(false);
    }
  };

  // Cancel warning
  const cancelWarn = () => {
    setShowConfirmModal(false);
  };

  // Show deletion confirmation modal
  const handleRemove = () => {
    setShowDeleteModal(true);
  };

  // Actually execute the removal after confirmation (change status to removed)
  const confirmRemove = async () => {
    if (!onRemove || !post) return;

    try {
      // Change status to removed instead of deleting from database
      onRemove(post.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error removing post:", error);
      setShowDeleteModal(false);
    }
  };

  // Cancel removal
  const cancelRemove = () => {
    setShowDeleteModal(false);
  };

  // Handle viewing user details
  const handleViewUser = async () => {
    if (post?.user?.id) {
      setLoadingUser(true);
      try {
        const fullUser = await fetchUserById(post.user.id);
        if (fullUser) {
          setSelectedUser(fullUser);
          setIsUserDrawerOpen(true);
        } else {
          console.error("User not found");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoadingUser(false);
      }
    }
  };

  // Close user drawer
  const handleCloseUserDrawer = () => {
    setIsUserDrawerOpen(false);
    setSelectedUser(null);
  };

  // Handle warning user from user detail drawer
  const handleUserWarn = async (userId: string) => {
    try {
      // Increment warning count
      await incrementUserWarningCount(userId);

      // Update user status to warning if not already banned
      if (selectedUser && selectedUser.status !== USER_STATUS.BANNED) {
        await updateUserStatus(userId, USER_STATUS.WARNING);

        // Update selected user state to reflect changes
        const updatedUser = await fetchUserById(userId);
        if (updatedUser) {
          setSelectedUser(updatedUser);
        }
      }

      console.log("User warned successfully:", userId);
    } catch (error) {
      console.error("Error warning user:", error);
    }
  };

  // Handle suspend/unsuspend toggle from user detail drawer
  const handleUserSuspendToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus =
        currentStatus === USER_STATUS.SUSPENDED
          ? USER_STATUS.ACTIVE
          : USER_STATUS.SUSPENDED;
      await updateUserStatus(userId, newStatus, config?.suspendDurationDays || 30);

      // Update selected user state to reflect changes
      const updatedUser = await fetchUserById(userId);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }

      console.log(
        `User ${newStatus === USER_STATUS.SUSPENDED ? "suspended" : "unsuspended"} successfully:`,
        userId,
      );
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case POST_STATUS.ACTIVE:
        return "bg-green-100 text-green-800 border-green-200";
      case POST_STATUS.EXPIRED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case POST_STATUS.REMOVED:
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-125 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Post Details
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
          {/* Status Badge */}
          <div className="flex justify-between items-start">
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(post.status)}`}
            >
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ID: {post.id}
            </span>
          </div>

          {/* Post Content */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content
              </label>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-40 overflow-y-auto">
                {post.content}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author
              </label>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="text-sm text-gray-900 dark:text-white">
                  {post.user.name}
                </span>
                <button
                  onClick={handleViewUser}
                  disabled={loadingUser}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-1"
                >
                  {loadingUser ? (
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
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {post.category}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Posted Date
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                {formatDate(post.postDate)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Likes
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded text-center">
                  {post.likes}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dislikes
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded text-center">
                  {post.dislikes}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reports
                  {shouldShowWarning && (
                    <span className="ml-1 text-xs text-red-600 font-medium">
                      ⚠️
                    </span>
                  )}
                </label>
                <p
                  className={`text-sm p-2 rounded text-center ${
                    shouldShowWarning
                      ? "text-red-900 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-900/50 dark:border-red-800"
                      : "text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700"
                  }`}
                >
                  {post.reportCount}
                  {config && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      / {config.reportThresholds?.urgent || 10}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {shouldShowWarning && (
              <div className="bg-orange-50 dark:bg-orange-900/50 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      Action Required
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                      This post has reached the maximum threshold (
                      {config?.reportThresholds?.urgent || 10} reports) and
                      requires administrative action.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {canWarn && (
              <button
                onClick={handleWarn}
                className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                  shouldShowWarning
                    ? "text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100 dark:text-orange-300 dark:bg-orange-900/50 dark:border-orange-800 dark:hover:bg-orange-900/70"
                    : "text-yellow-700 bg-yellow-50 border-yellow-200 hover:bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-800 dark:hover:bg-yellow-900/70"
                }`}
              >
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span>
                  {shouldShowWarning
                    ? "Warn User (Threshold Exceeded)"
                    : "Warn the User"}
                </span>
              </button>
            )}

            {onRemove && post.status !== POST_STATUS.REMOVED && (
              <button
                onClick={handleRemove}
                className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center space-x-2 dark:text-red-300 dark:bg-red-900/50 dark:border-red-800 dark:hover:bg-red-900/70"
              >
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Remove Post</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <>
          {/* Modal backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
            onClick={cancelWarn}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-orange-600 dark:text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Confirm Warning
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This action will warn the user
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Are you sure you want to warn{" "}
                    <strong>{post.user.name}</strong> for this post?
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Post content:
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                      "{post.content}"
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                      ℹ️ What happens when you warn a user:
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• Post status will be changed to "removed"</li>
                      <li>
                        • User will receive a notification about community
                        guidelines
                      </li>
                      <li>• This action will be logged for admin records</li>
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={cancelWarn}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmWarn}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-orange-600 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                  >
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span>Confirm Warning</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Deletion Confirmation Modal */}
      {showDeleteModal && (
        <>
          {/* Modal backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
            onClick={cancelRemove}
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Confirm Removal
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This action will remove the post
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Are you sure you want to remove this post by{" "}
                    <strong>{post.user.name}</strong>?
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Post content:
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                      "{post.content}"
                    </p>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                      ⚠️ What happens when you remove a post:
                    </p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      <li>• Post status will be changed to "removed"</li>
                      <li>• Post will be hidden from public view</li>
                      <li>• Post data remains in database for admin records</li>
                      <li>• This action will be logged for admin tracking</li>
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={cancelRemove}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRemove}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Confirm Removal</span>
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
