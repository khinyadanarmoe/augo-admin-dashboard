import React, { useEffect, useState } from "react";
import {
  Announcement,
  ANNOUNCEMENT_STATUS,
  AFFILIATION_TYPE,
  AFFILIATIONS,
  CONTENT_TOPICS,
} from "@/types/export";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { subscribeToAnnouncements } from "@/lib/firestore/announcements";
import AnnouncementDetailDrawer from "@/components/drawers/AnnouncementDetailDrawer";
import {
  getAnnouncementStatusColor,
  formatAnnouncementStatus,
} from "@/utils/announcementUtils";
import { useToast } from "@/contexts/ToastContext";
import {
  SortableTableHeader,
  RegularTableHeader,
} from "@/components/ui/SortableTableHeader";

interface AnnouncementTableProps {
  announcements?: Announcement[];
  initialSearchTerm?: string;
}

export default function AnnouncementTable({
  announcements,
  initialSearchTerm = "",
}: AnnouncementTableProps) {
  const toast = useToast();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [dateFilter, setDateFilter] = useState("");
  const [affiliationType, setAffiliationType] = useState("");
  const [affiliationSpecific, setAffiliationSpecific] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"startDate" | "endDate">("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [fetchedAnnouncements, setFetchedAnnouncements] = useState<
    Announcement[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    announcementId: string;
    title: string;
  }>({
    isOpen: false,
    announcementId: "",
    title: "",
  });

  // Subscribe to announcements in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAnnouncements(
      (data) => {
        console.log("Received announcements:", data);
        setFetchedAnnouncements(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching announcements:", error);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update search term when initialSearchTerm changes
  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Reset specific affiliation when type changes
  useEffect(() => {
    setAffiliationSpecific("");
  }, [affiliationType]);

  // Auto-activate scheduled announcements and auto-expire active announcements
  useEffect(() => {
    const autoProcessAnnouncements = async () => {
      if (fetchedAnnouncements.length === 0) return;

      try {
        const { processAnnouncementStatusTransitions } =
          await import("@/lib/firestore/announcements");
        const result = await processAnnouncementStatusTransitions();

        if (result.activated > 0 || result.expired > 0) {
          console.log(
            `Processed announcements: ${result.activated} activated, ${result.expired} expired`,
          );
          // Data will update automatically via subscription
        }
      } catch (err) {
        console.error("Error auto-processing announcements:", err);
      }
    };

    autoProcessAnnouncements();
  }, [fetchedAnnouncements]);

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

  const displayAnnouncements =
    announcements ||
    (fetchedAnnouncements.length > 0 ? fetchedAnnouncements : []);

  // Filter announcements
  const filteredAnnouncements = displayAnnouncements
    .filter((announcement) => {
      // Format date without timezone conversion to avoid date shifts
      const date = new Date(announcement.startDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const startDate = `${year}-${month}-${day}`;

      const searchLower = searchTerm.toLowerCase();
      const titleMatch =
        searchTerm === "" ||
        announcement.title.toLowerCase().includes(searchLower) ||
        announcement.id.toLowerCase().includes(searchLower) ||
        announcement.department?.toLowerCase().includes(searchLower);
      const affiliationMatch =
        affiliationSpecific === "" ||
        announcement.department === affiliationSpecific;
      return (
        titleMatch &&
        (dateFilter === "" || startDate === dateFilter) &&
        affiliationMatch &&
        (statusFilter === "" || announcement.status === statusFilter)
      );
    })
    .sort((a, b) => {
      const getValue = (announcement: Announcement, field: string) => {
        switch (field) {
          case "startDate":
            return new Date(announcement.startDate).getTime();
          case "endDate":
            return new Date(announcement.endDate).getTime();
          default:
            return 0;
        }
      };
      const aVal = getValue(a, sortBy);
      const bVal = getValue(b, sortBy);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const totalPages = Math.ceil(filteredAnnouncements.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedAnnouncements = filteredAnnouncements.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: "startDate" | "endDate") => {
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

  const getStatusColor = getAnnouncementStatusColor;

  const getTopicColor = (topic: string) => {
    const colors = {
      Academic:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "Registration & Finance":
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      Events:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      Career: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      "Scholarship works":
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      Administrative:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "Emergency & Safety":
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return (
      colors[topic as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    );
  };

  const handleView = (announcementId: string) => {
    const announcement = displayAnnouncements.find(
      (a) => a.id === announcementId,
    );
    setSelectedAnnouncement(announcement || null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleRemove = (announcementId: string) => {
    const announcement = displayAnnouncements.find(
      (a) => a.id === announcementId,
    );
    if (announcement) {
      setDeleteModal({
        isOpen: true,
        announcementId: announcement.id,
        title: announcement.title,
      });
    }
  };

  const confirmDelete = async () => {
    try {
      const { removeAnnouncement } =
        await import("@/lib/firestore/announcements");
      await removeAnnouncement(deleteModal.announcementId);
      // Data will update automatically via subscription
      setDeleteModal({ isOpen: false, announcementId: "", title: "" });
      toast.success("Announcement removed successfully");
    } catch (error) {
      console.error("Error removing announcement:", error);
      toast.error("Failed to remove announcement");
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, announcementId: "", title: "" });
  };

  const handleApprove = async (announcementId: string) => {
    try {
      const { approveAnnouncement } =
        await import("@/lib/firestore/announcements");
      await approveAnnouncement(announcementId);
      // Data will update automatically via subscription
      setIsDrawerOpen(false);
      toast.success("Announcement approved and scheduled successfully!");
    } catch (error) {
      console.error("Error approving announcement:", error);
      toast.error("Failed to approve announcement");
    }
  };

  const handleReject = async (announcementId: string) => {
    try {
      const { declineAnnouncement } =
        await import("@/lib/firestore/announcements");
      await declineAnnouncement(announcementId);
      // Data will update automatically via subscription
      setIsDrawerOpen(false);
      toast.success("Announcement declined");
    } catch (error) {
      console.error("Error declining announcement:", error);
      toast.error("Failed to decline announcement");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by title, ID, or affiliation name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          <select
            value={affiliationType}
            onChange={(e) => setAffiliationType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="Faculty">Faculty</option>
            <option value="Office">Office</option>
            <option value="Student Organization">Student Organization</option>
          </select>

          <select
            value={affiliationSpecific}
            onChange={(e) => setAffiliationSpecific(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={!affiliationType}
          >
            <option value="">
              {affiliationType ? "All " + affiliationType : "Select Type First"}
            </option>
            {affiliationType &&
              AFFILIATIONS[affiliationType as keyof typeof AFFILIATIONS]?.map(
                (affiliation) => (
                  <option key={affiliation} value={affiliation}>
                    {affiliation}
                  </option>
                ),
              )}
          </select>

          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Registration & Finance">
              Registration & Finance
            </option>
            <option value="Events">Events</option>
            <option value="Career">Career</option>
            <option value="Scholarship works">Scholarship works</option>
            <option value="Administrative">Administrative</option>
            <option value="Emergency & Safety">Emergency & Safety</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="declined">Declined</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <RegularTableHeader label="Title" />
              <RegularTableHeader label="Affiliation" />
              <SortableTableHeader
                field="startDate"
                label="Start Date"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableTableHeader
                field="endDate"
                label="End Date"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <RegularTableHeader label="Status" />
              <RegularTableHeader label="Urgent" />
              <RegularTableHeader label="Action" />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedAnnouncements.map((announcement) => (
              <tr
                key={announcement.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white max-w-xs">
                  <div className="truncate">{announcement.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                    {announcement.department}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {new Date(announcement.startDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {new Date(announcement.endDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(announcement.status)}`}
                  >
                    {formatAnnouncementStatus(announcement.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {announcement.isUrgent && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full">
                      Urgent
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleView(announcement.id)}
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
                  {announcement.status !== "removed" && (
                    <button
                      onClick={() => handleRemove(announcement.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                      title="Remove"
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
                  )}
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
              {Math.min(startIndex + rowsPerPage, filteredAnnouncements.length)}{" "}
              of {filteredAnnouncements.length} rows
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

      {/* Announcement Detail Drawer */}
      <AnnouncementDetailDrawer
        announcement={selectedAnnouncement}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Remove Announcement
                </h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Are you sure you want to remove this announcement? It will be
                marked as "removed" and hidden from active listings.
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-3 rounded">
                {deleteModal.title}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
