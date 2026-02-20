import React, { useEffect, useState } from "react";
import { User, USER_STATUS, FACULTIES, UserStatus } from "@/types/export";
import {
  fetchUsers,
  incrementUserWarningCount,
  updateUserStatus,
} from "@/lib/firestore/users";
import { markUserPostsAsWarned } from "@/lib/firestore/posts";
import { resolveReportsByPostIds } from "@/lib/firestore/reports";
import UserDetailDrawer from "../drawers/UserDetailDrawer";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminConfiguration } from "@/hooks/useAdminConfiguration";
import {
  SortableTableHeader,
  RegularTableHeader,
} from "@/components/ui/SortableTableHeader";
import {
  SearchIcon,
  EyeIcon,
  WarnIcon,
  BanIcon,
  UnbanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@/components/ui/icons";

interface UserTableProps {
  users?: User[];
  initialSearchTerm?: string;
}

export default function UserTable({
  users,
  initialSearchTerm = "",
}: UserTableProps) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const { config } = useAdminConfiguration();
  const banThreshold = config?.banThreshold || 5;
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState("");
  const [facultyFilter, setFacultyFilter] = useState("");
  const [sortBy, setSortBy] = useState<"warningCount">("warningCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fetchedUsers, setFetchedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    currentStatus: string;
    userName: string;
  }>({ isOpen: false, userId: "", currentStatus: "", userName: "" });

  useEffect(() => {
    setLoading(true);
    fetchUsers()
      .then(async (data) => {
        const users: User[] = data.map((user) => ({
          ...user,
          status: user.status.toLowerCase() as UserStatus,
        }));

        // Auto-ban users whose warningCount >= banThreshold
        const autoBanPromises = users
          .filter(
            (u) =>
              u.warningCount >= banThreshold && u.status !== USER_STATUS.BANNED,
          )
          .map(async (u) => {
            await updateUserStatus(
              u.id,
              USER_STATUS.BANNED,
              config?.banDurationDays || 30,
            );
            u.status = USER_STATUS.BANNED as UserStatus;
          });
        await Promise.all(autoBanPromises);

        setFetchedUsers(users);
      })
      .catch((err) => console.error("Error fetching users:", err))
      .finally(() => setLoading(false));
  }, [banThreshold]);

  // Update search term when initialSearchTerm changes
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Handle loading and authentication states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Hook handles redirect
  }

  const displayUsers = users || (fetchedUsers.length > 0 ? fetchedUsers : []);

  const filteredUsers = displayUsers
    .filter((user) => {
      return (
        (searchTerm === "" ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter === "" || user.status === statusFilter) &&
        (facultyFilter === "" || user.faculty === facultyFilter)
      );
    })
    .sort((a, b) => {
      const aVal = a.warningCount || 0;
      const bVal = b.warningCount || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: "warningCount") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case USER_STATUS.ACTIVE:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case USER_STATUS.WARNING:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case USER_STATUS.BANNED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleView = (userId: string) => {
    const user = displayUsers.find((u) => u.id === userId);
    setSelectedUser(user || null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUser(null);
  };

  const handleWarn = async (userId: string) => {
    try {
      // Increment warning count
      await incrementUserWarningCount(userId);

      // Mark all user's posts as warned and get their IDs
      const warnedPostIds = await markUserPostsAsWarned(userId);

      // Resolve all reports for the user's posts
      if (warnedPostIds.length > 0) {
        await resolveReportsByPostIds(warnedPostIds);
      }

      // Refresh users data to get updated warning count
      setLoading(true);
      const updatedUsers = await fetchUsers();
      const users: User[] = updatedUsers.map((user) => ({
        ...user,
        status: user.status.toLowerCase() as UserStatus,
      }));

      // Auto-ban if warning count now exceeds threshold
      const warnedUser = users.find((u) => u.id === userId);
      if (
        warnedUser &&
        warnedUser.warningCount >= banThreshold &&
        warnedUser.status !== USER_STATUS.BANNED
      ) {
        await updateUserStatus(
          userId,
          USER_STATUS.BANNED,
          config?.banDurationDays || 30,
        );
        warnedUser.status = USER_STATUS.BANNED as UserStatus;
      } else if (warnedUser && warnedUser.status !== USER_STATUS.BANNED) {
        await updateUserStatus(userId, USER_STATUS.WARNING);
        warnedUser.status = USER_STATUS.WARNING as UserStatus;
      }

      setFetchedUsers(users);
      setLoading(false);

      console.log(
        "User warned successfully, posts marked as warned, and related reports resolved:",
        userId,
      );
    } catch (error) {
      console.error("Error warning user:", error);
      setError("Failed to warn user");
    }
  };

  const handleBanToggle = async (userId: string, currentStatus: string) => {
    const user = displayUsers.find((u) => u.id === userId);
    setConfirmModal({
      isOpen: true,
      userId,
      currentStatus,
      userName: user?.name || "this user",
    });
  };

  const confirmBanToggle = async () => {
    const { userId, currentStatus } = confirmModal;
    setConfirmModal({
      isOpen: false,
      userId: "",
      currentStatus: "",
      userName: "",
    });
    try {
      const newStatus =
        currentStatus === USER_STATUS.BANNED
          ? USER_STATUS.ACTIVE
          : USER_STATUS.BANNED;
      await updateUserStatus(userId, newStatus, config?.banDurationDays || 30);

      setLoading(true);
      const updatedUsers = await fetchUsers();
      setFetchedUsers(updatedUsers);
      setLoading(false);

      console.log(
        `User ${newStatus === USER_STATUS.BANNED ? "banned" : "unbanned"} successfully:`,
        userId,
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      setError("Failed to update user status");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4">
          {/* Search Box */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              {Object.values(USER_STATUS).map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Faculties</option>
              {Object.values(FACULTIES).map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <RegularTableHeader label="User Name" />
              <RegularTableHeader label="Email" />
              <RegularTableHeader label="Faculty" />
              <SortableTableHeader
                field="warningCount"
                label="Warning Count"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <RegularTableHeader label="Status" />
              <RegularTableHeader label="Actions" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedUsers.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-300">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {user.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    {user.faculty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        user.warningCount > 0
                          ? "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-800"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {user.warningCount}
                    </span>
                    {user.warningCount > 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleView(user.id)}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1"
                    title="View"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleWarn(user.id)}
                    className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 p-1"
                    title="Warn"
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
                  </button>
                  <button
                    onClick={() => handleBanToggle(user.id, user.status)}
                    className={
                      user.status === USER_STATUS.BANNED
                        ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1"
                        : "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                    }
                    title={user.status === USER_STATUS.BANNED ? "Unban" : "Ban"}
                  >
                    {user.status === USER_STATUS.BANNED ? (
                      <BanIcon className="w-4 h-4" />
                    ) : (
                      <UnbanIcon className="w-4 h-4" />
                    )}
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
              {Math.min(startIndex + rowsPerPage, filteredUsers.length)} of{" "}
              {filteredUsers.length} rows
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

      {/* Confirm Ban/Unban Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {confirmModal.currentStatus === USER_STATUS.BANNED
                ? "Unban User"
                : "Ban User"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmModal.currentStatus === USER_STATUS.BANNED
                ? `Are you sure you want to unban ${confirmModal.userName}? They will be able to create posts again.`
                : `Are you sure you want to ban ${confirmModal.userName}? They will no longer be able to create posts.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    userId: "",
                    currentStatus: "",
                    userName: "",
                  })
                }
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBanToggle}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  confirmModal.currentStatus === USER_STATUS.BANNED
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmModal.currentStatus === USER_STATUS.BANNED
                  ? "Unban"
                  : "Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onWarn={handleWarn}
        onBanToggle={handleBanToggle}
      />
    </div>
  );
}
