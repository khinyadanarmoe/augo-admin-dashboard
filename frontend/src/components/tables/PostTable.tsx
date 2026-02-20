import React, { useState, useEffect, useCallback } from "react";
import { Post, POST_STATUS, POST_CATEGORIES, LOCATIONS } from "@/types/export";
import PostDetailDrawer from "../drawers/PostDetailDrawer";
import SendNotificationModal from "@/components/SendNotificationModal";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminConfiguration } from "@/hooks/useAdminConfiguration";
import {
  subscribeToPostsUpdates,
  updatePostStatus,
  updatePostWarningStatus,
  deletePost,
} from "@/lib/firestore/posts";
import { resolveReportsByPostId } from "@/lib/firestore/reports";
import { sendWarningNotificationToUser } from "@/lib/firestore/notifications";
import { incrementUserWarningCount } from "@/lib/firestore/users";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import {
  SortableTableHeader,
  RegularTableHeader,
} from "@/components/ui/SortableTableHeader";

interface PostTableProps {
  posts?: Post[];
  initialSearchTerm?: string;
}

export default function PostTable({
  posts: propPosts,
  initialSearchTerm = "",
}: PostTableProps) {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const { config } = useAdminConfiguration();
  const [user] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "likes" | "dislikes" | "date" | "reports"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Firestore state
  const [firestorePosts, setFirestorePosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmation modal state
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [postToWarn, setPostToWarn] = useState<Post | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedPostForNotification, setSelectedPostForNotification] =
    useState<Post | null>(null);

  // Update search term when initialSearchTerm changes
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Subscribe to Firestore posts
  useEffect(() => {
    if (!isAuthenticated || propPosts) {
      setIsLoadingPosts(false);
      return;
    }

    const loadPosts = () => {
      setIsLoadingPosts(true);
      const unsubscribe = subscribeToPostsUpdates(
        (posts) => {
          setFirestorePosts(posts);
          setIsLoadingPosts(false);
          setError(null);
        },
        (error) => {
          console.error("Error loading posts:", error);
          setError("Failed to load posts from database");
          setIsLoadingPosts(false);
        },
      );
      return unsubscribe;
    };

    const unsubscribe = loadPosts();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, propPosts]);

  // Use prop posts or Firestore posts
  const displayPosts = propPosts || firestorePosts;

  // Auto-expire active posts past visibility duration
  useEffect(() => {
    if (!config?.postVisibilityDuration || displayPosts.length === 0) return;

    const visibilityMs = config.postVisibilityDuration * 60 * 60 * 1000;
    const now = Date.now();

    displayPosts.forEach(async (post) => {
      if (post.status !== POST_STATUS.ACTIVE) return;
      const postTime = new Date(post.postDate).getTime();
      if (isNaN(postTime)) return;
      if (now - postTime > visibilityMs) {
        try {
          await updatePostStatus(post.id, POST_STATUS.EXPIRED);
          console.log("Post auto-expired:", post.id);
        } catch (err) {
          console.error("Error auto-expiring post:", err);
        }
      }
    });
  }, [displayPosts, config?.postVisibilityDuration]);

  // Filter posts
  const filteredPosts = displayPosts
    .filter((post) => {
      const searchLower = searchTerm.toLowerCase();
      const contentMatch = post.content.toLowerCase().includes(searchLower);
      const userMatch = post.user.name.toLowerCase().includes(searchLower);
      const idMatch = post.id.toLowerCase().includes(searchLower);
      const postDate = new Date(post.postDate).toISOString().split("T")[0];
      const dateMatch = dateFilter === "" || postDate === dateFilter;
      const locationMatch =
        locationFilter === "" || post.location === locationFilter;
      const categoryMatch =
        categoryFilter === "" || post.category === categoryFilter;
      const statusMatch = statusFilter === "" || post.status === statusFilter;

      return (
        (contentMatch || userMatch || idMatch) &&
        dateMatch &&
        locationMatch &&
        categoryMatch &&
        statusMatch
      );
    })
    .sort((a, b) => {
      const getValue = (post: Post, field: string) => {
        switch (field) {
          case "likes":
            return post.likes;
          case "dislikes":
            return post.dislikes;
          case "reports":
            return post.reportCount;
          case "date":
            return new Date(post.postDate).getTime();
          default:
            return 0;
        }
      };
      const aVal = getValue(a, sortBy);
      const bVal = getValue(b, sortBy);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const handleView = (postId: string) => {
    const post = filteredPosts.find((p) => p.id === postId);
    setSelectedPost(post || null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedPost(null);
  };

  // Show notification modal for warning
  const handleWarn = useCallback(
    (postId: string) => {
      const post = filteredPosts.find((p) => p.id === postId);
      if (post) {
        setSelectedPostForNotification(post);
        setShowNotificationModal(true);
      }
    },
    [filteredPosts],
  );

  // Handle notification sent
  const handleNotificationSent = useCallback(
    async (notificationId: string) => {
      if (!selectedPostForNotification) return;

      try {
        // Update post status to removed
        await updatePostStatus(
          selectedPostForNotification.id,
          POST_STATUS.REMOVED,
        );

        // Set post as warned
        await updatePostWarningStatus(selectedPostForNotification.id, true);

        // Auto-resolve all related reports since post is warned
        await resolveReportsByPostId(selectedPostForNotification.id);

        // Increment user warning count
        await incrementUserWarningCount(selectedPostForNotification.user.id);

        console.log(
          "Post warned successfully, isWarned set to true, and related reports resolved:",
          selectedPostForNotification.id,
        );
        setShowNotificationModal(false);
        setSelectedPostForNotification(null);
      } catch (error) {
        console.error("Error updating post status:", error);
        setError("Failed to update post status");
      }
    },
    [selectedPostForNotification],
  );

  // Show confirmation modal for removal
  const handleRemove = useCallback(
    (postId: string) => {
      const post = filteredPosts.find((p) => p.id === postId);
      if (post) {
        setPostToDelete(post);
        setShowDeleteModal(true);
      }
    },
    [filteredPosts],
  );

  // Confirm removal action (change status to removed instead of deleting)
  const confirmRemove = useCallback(async () => {
    if (!postToDelete) return;

    try {
      // Change status to removed instead of deleting from database
      await updatePostStatus(postToDelete.id, POST_STATUS.REMOVED);
      console.log("Post status changed to removed:", postToDelete.id);
      setShowDeleteModal(false);
      setPostToDelete(null);
    } catch (error) {
      console.error("Error removing post:", error);
      setError("Failed to remove post");
      setShowDeleteModal(false);
      setPostToDelete(null);
    }
  }, [postToDelete]);

  // Cancel removal
  const cancelRemove = useCallback(() => {
    setShowDeleteModal(false);
    setPostToDelete(null);
  }, []);

  const totalPages = Math.ceil(filteredPosts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedPosts = filteredPosts.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1);
  };

  const handleSort = (field: "likes" | "dislikes" | "date" | "reports") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case POST_STATUS.ACTIVE:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case POST_STATUS.EXPIRED:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case POST_STATUS.REMOVED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Handle loading and authentication states - moved to end after all hooks
  if (authLoading || isLoadingPosts) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">
          Loading posts...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Hook handles redirect
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  // Show empty state if no posts
  if (!isLoadingPosts && displayPosts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No posts found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            There are no posts in the database yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4">
          {/* Search Box */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Filter by date"
            />

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Locations</option>
              <option value="Yangon">Yangon</option>
              <option value="Mandalay">Mandalay</option>
              <option value="Naypyitaw">Naypyitaw</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              <option value="Photography">Photography</option>
              <option value="Education">Education</option>
              <option value="Sports">Sports</option>
              <option value="Technology">Technology</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="removed">Removed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <SortableTableHeader
                field="date"
                label="Post Date"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <RegularTableHeader label="User" />
              <RegularTableHeader label="Post" />
              <RegularTableHeader label="Category" />
              <SortableTableHeader
                field="likes"
                label="Likes"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableTableHeader
                field="dislikes"
                label="Dislikes"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableTableHeader
                field="reports"
                label="Reports"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <RegularTableHeader label="Status" />
              <RegularTableHeader label="Actions" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedPosts.map((post) => (
              <tr
                key={post.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {new Date(post.postDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                        {post.user.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {post.user.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                  {post.content}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    {post.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <span className="flex items-center text-green-600">
                    👍 {post.likes}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <span className="flex items-center text-red-600">
                    👎 {post.dislikes}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      post.reportCount > 0
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                    }`}
                  >
                    {post.reportCount}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(post.status)}`}
                    >
                      {post.status}
                    </span>
                    {post.isWarned && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
                        ⚠️ Warned
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleView(post.id)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1"
                    title="View"
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemove(post.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                  </button>
                </td>
              </tr>
            ))}
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
            <span>
              {startIndex + 1}-
              {Math.min(startIndex + rowsPerPage, filteredPosts.length)} of{" "}
              {filteredPosts.length} rows
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  d="M15 19l-7-7 7-7"
                />
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
                      ? "bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Post Detail Drawer */}
      <PostDetailDrawer
        post={selectedPost}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onRemove={handleRemove}
      />

      {/* Send Notification Modal */}
      {showNotificationModal && selectedPostForNotification && (
        <>
          {/* Modal backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60"
            onClick={() => {
              setShowNotificationModal(false);
              setSelectedPostForNotification(null);
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Send Notification to User
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Reported User: {selectedPostForNotification.user.name} (
                  {selectedPostForNotification.user.id})
                </p>
              </div>
              <div className="p-4">
                <SendNotificationModal
                  userId={selectedPostForNotification.user.id}
                  adminId={user?.uid || "admin"}
                  relatedPostId={selectedPostForNotification.id}
                  onNotificationSent={handleNotificationSent}
                />
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedPostForNotification(null);
                  }}
                  className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Removal Confirmation Modal */}
      {showDeleteModal && postToDelete && (
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
                    <strong>{postToDelete.user.name}</strong>?
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Post content:
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                      "{postToDelete.content}"
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
    </div>
  );
}
