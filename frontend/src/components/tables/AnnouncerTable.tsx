import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Announcer, AFFILIATION_TYPES, ANNOUNCER_STATUS } from "@/types/export";
import type { AnnouncerStatus } from "@/types/constants";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import AnnouncerDetailDrawer from "../drawers/AnnouncersDetailDrawer";
import { fetchAnnouncers } from "@/lib/firestore/announcers";
import {
  fetchAffiliations,
  type AffiliationData,
} from "@/lib/firestore/affiliations";
import {
  SortableTableHeader,
  RegularTableHeader,
} from "@/components/ui/SortableTableHeader";
import {
  SearchIcon,
  EyeIcon,
  EditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@/components/ui/icons";
import { useStorageUrl } from "@/lib/storageUtils";

interface AnnouncerTableProps {
  announcers?: Announcer[];
}

interface AnnouncerRowProps {
  announcer: Announcer;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onStatusToggle: (announcer: Announcer) => void;
  getStatusColor: (status: string) => string;
  getAffiliationNameColor: (name: string) => string;
}

// Separate component to properly use useStorageUrl hook
function AnnouncerRow({
  announcer,
  onView,
  onEdit,
  onStatusToggle,
  getStatusColor,
  getAffiliationNameColor,
}: AnnouncerRowProps) {
  const { url: profileUrl } = useStorageUrl(announcer.profilePicture || "");

  return (
    <tr key={announcer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-3 py-4 whitespace-nowrap">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={announcer.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <span className="text-xs font-medium text-purple-600 dark:text-purple-300">
                {announcer.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center">
          <div className="truncate">
            <div
              className="text-sm font-medium text-gray-900 dark:text-white truncate"
              title={announcer.name}
            >
              {announcer.name}
            </div>
            <div
              className="text-xs text-gray-500 dark:text-gray-400 truncate"
              title={announcer.id}
            >
              ID: {announcer.id}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
        <div className="truncate" title={announcer.email}>
          {announcer.email}
        </div>
      </td>
      <td className="px-3 py-4">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full truncate inline-block max-w-full ${getAffiliationNameColor(announcer.affiliation_name)}`}
          title={announcer.affiliation_name}
        >
          {announcer.affiliation_name}
        </span>
      </td>
      <td className="px-3 py-4">
        <span
          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full truncate inline-block max-w-full"
          title={announcer.affiliation_type}
        >
          {announcer.affiliation_type}
        </span>
      </td>
      <td className="px-3 py-4">
        <button
          onClick={() => onStatusToggle(announcer)}
          className={`px-2 py-1 text-xs font-medium rounded-full transition-colors hover:opacity-80 ${getStatusColor(announcer.status)}`}
          title={`Click to ${announcer.status === ANNOUNCER_STATUS.ACTIVE ? "deactivate" : "activate"}`}
        >
          {announcer.status}
        </button>
      </td>
      <td className="px-3 py-4 text-center text-sm text-gray-900 dark:text-white">
        {announcer.total_announcements}
      </td>
      <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
        <div className="truncate">
          {announcer.joined_date
            ? new Date(announcer.joined_date).toLocaleDateString()
            : "No Date"}
        </div>
      </td>
      <td className="px-3 py-4 text-sm">
        <div className="flex space-x-1">
          <button
            onClick={() => onView(announcer.id)}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 p-1"
            title="View"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(announcer.id)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1"
            title="Edit"
          >
            <EditIcon className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AnnouncerTable({ announcers }: AnnouncerTableProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [affiliationTypeFilter, setAffiliationTypeFilter] = useState("");
  const [affiliationNameFilter, setAffiliationNameFilter] = useState("");
  const [sortBy, setSortBy] = useState<"joined_date" | "total_announcements">(
    "joined_date",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedAnnouncer, setSelectedAnnouncer] = useState<Announcer | null>(
    null,
  );
  const [fetchedAnnouncers, setFetchedAnnouncers] = useState<
    Announcer[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [affiliations, setAffiliations] = useState<AffiliationData[]>([]);

  // Load affiliations from Firestore
  useEffect(() => {
    const loadAffiliations = async () => {
      try {
        const data = await fetchAffiliations();
        setAffiliations(data);
      } catch (error) {
        console.error("Error loading affiliations:", error);
      }
    };
    loadAffiliations();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAnnouncers()
      .then((data) => {
        // console.log('Raw announcer data:', data);

        // Cast status to proper AnnouncerStatus type and handle Firestore Timestamps
        const announcers: Announcer[] = data.map((announcer) => ({
          ...announcer,
          status: announcer.status?.toLowerCase() as AnnouncerStatus,
          joined_date: (announcer.joined_date as any)?.toDate
            ? (announcer.joined_date as any).toDate().toISOString()
            : announcer.joined_date,
        }));

        // console.log('Processed announcer data:', announcers);
        setFetchedAnnouncers(announcers);
      })
      .catch((err) => console.error("Error fetching announcers:", err))
      .finally(() => setLoading(false));
  }, []);

  // Reset specific affiliation when type changes
  useEffect(() => {
    setAffiliationNameFilter("");
  }, [affiliationTypeFilter]);

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

  const displayAnnouncers =
    announcers ||
    (fetchedAnnouncers && fetchedAnnouncers.length > 0
      ? fetchedAnnouncers
      : []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case ANNOUNCER_STATUS.ACTIVE:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case ANNOUNCER_STATUS.INACTIVE:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getAffiliationNameColor = (affiliation_name: string) => {
    const colors = {
      "Academic Affairs":
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "Student Services":
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "Research Department":
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "Career Center":
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "IT Department":
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
      "VMES Committee":
        "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
    };
    return (
      colors[affiliation_name as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    );
  };

  const handleView = (announcerId: string) => {
    const announcer =
      displayAnnouncers.find((a: Announcer) => a.id === announcerId) || null;
    setSelectedAnnouncer(announcer);
    setShowDetailDrawer(true);
  };

  const handleCloseDrawer = () => {
    setShowDetailDrawer(false);
    setSelectedAnnouncer(null);
  };

  const handleEdit = (announcerId: string) => {
    const announcer = displayAnnouncers.find(
      (a: Announcer) => a.id === announcerId,
    );
    if (announcer) {
      router.push({
        pathname: "/announcers/add",
        query: {
          edit: "true",
          id: announcer.id,
          name: announcer.name,
          email: announcer.email,
          affiliation_type: announcer.affiliation_type,
          affiliation_name: announcer.affiliation_name,
          phone: announcer.phone || "",
          role: announcer.role || "",
        },
      });
    }
  };

  const handleStatusToggle = (announcer: Announcer) => {
    setSelectedAnnouncer(announcer);
    setShowStatusModal(true);
  };

  const confirmStatusChange = () => {
    if (selectedAnnouncer) {
      const newStatus =
        selectedAnnouncer.status === ANNOUNCER_STATUS.ACTIVE
          ? ANNOUNCER_STATUS.INACTIVE
          : ANNOUNCER_STATUS.ACTIVE;
      console.log(`Change ${selectedAnnouncer.name} status to:`, newStatus);
      // Here you would update the status in your data store
    }
    setShowStatusModal(false);
    setSelectedAnnouncer(null);
  };

  const cancelStatusChange = () => {
    setShowStatusModal(false);
    setSelectedAnnouncer(null);
  };

  const filteredAnnouncers = displayAnnouncers
    .filter((announcer: Announcer) => {
      return (
        (searchTerm === "" ||
          announcer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcer.affiliation_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) &&
        (statusFilter === "" || announcer.status === statusFilter) &&
        (affiliationTypeFilter === "" ||
          announcer.affiliation_type === affiliationTypeFilter) &&
        (affiliationNameFilter === "" ||
          announcer.affiliation_name === affiliationNameFilter)
      );
    })
    .sort((a, b) => {
      const getValue = (announcer: Announcer, field: string) => {
        switch (field) {
          case "joined_date":
            return new Date(announcer.joined_date).getTime();
          case "total_announcements":
            return announcer.total_announcements || 0;
          default:
            return 0;
        }
      };
      const aVal = getValue(a, sortBy);
      const bVal = getValue(b, sortBy);
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const totalPages = Math.ceil(filteredAnnouncers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedAnnouncers = filteredAnnouncers.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: "joined_date" | "total_announcements") => {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-full">
      {/* Search and Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-4">
          {/* Search Box */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, contact, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value={ANNOUNCER_STATUS.ACTIVE}>Active</option>
              <option value={ANNOUNCER_STATUS.INACTIVE}>Inactive</option>
            </select>

            <select
              value={affiliationTypeFilter}
              onChange={(e) => setAffiliationTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value={AFFILIATION_TYPES.FACULTY}>Faculty</option>
              <option value={AFFILIATION_TYPES.OFFICE}>Office</option>
              <option value={AFFILIATION_TYPES.STUDENT_ORG}>
                Student Organization
              </option>
            </select>

            <select
              value={affiliationNameFilter}
              onChange={(e) => setAffiliationNameFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!affiliationTypeFilter}
            >
              <option value="">
                {affiliationTypeFilter === AFFILIATION_TYPES.FACULTY
                  ? "All Faculty"
                  : affiliationTypeFilter === AFFILIATION_TYPES.OFFICE
                    ? "All Office"
                    : affiliationTypeFilter === AFFILIATION_TYPES.STUDENT_ORG
                      ? "All Student Organizations"
                      : "Select Type First"}
              </option>
              {affiliationTypeFilter &&
                affiliations
                  .filter((a) => a.type === affiliationTypeFilter)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((affiliation) => (
                    <option key={affiliation.name} value={affiliation.name}>
                      {affiliation.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-16" /> {/* Profile */}
            <col className="w-36" /> {/* Name */}
            <col className="w-44" /> {/* Email */}
            <col className="w-32" /> {/* Affiliation Name */}
            <col className="w-28" /> {/* Type */}
            <col className="w-20" /> {/* Status */}
            <col className="w-32" /> {/* Total */}
            <col className="w-28" /> {/* Date */}
            <col className="w-20" /> {/* Actions */}
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <RegularTableHeader
                label="Profile"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Name"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Email"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Affiliation Name"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Type"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Status"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <SortableTableHeader
                field="total_announcements"
                label="Total Announcements"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="px-2 py-y text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <SortableTableHeader
                field="joined_date"
                label="Joined"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Actions"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <span className="ml-3 text-gray-500 dark:text-gray-400">
                      Loading announcers...
                    </span>
                  </div>
                </td>
              </tr>
            ) : paginatedAnnouncers.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No announcers found.
                </td>
              </tr>
            ) : (
              paginatedAnnouncers.map((announcer: Announcer) => (
                <AnnouncerRow
                  key={announcer.id}
                  announcer={announcer}
                  onView={handleView}
                  onEdit={handleEdit}
                  onStatusToggle={handleStatusToggle}
                  getStatusColor={getStatusColor}
                  getAffiliationNameColor={getAffiliationNameColor}
                />
              ))
            )}
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
              {Math.min(startIndex + rowsPerPage, filteredAnnouncers.length)} of{" "}
              {filteredAnnouncers.length} rows
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
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
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDoubleRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Change Confirmation Modal */}
      {showStatusModal && selectedAnnouncer && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Status Change
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to{" "}
              {selectedAnnouncer.status === "active"
                ? "deactivate"
                : "activate"}{" "}
              <span className="font-medium">{selectedAnnouncer.name}</span>?
            </p>
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                  selectedAnnouncer.status === "active"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {selectedAnnouncer.status === "active"
                  ? "Deactivate"
                  : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcer Detail Drawer */}
      <AnnouncerDetailDrawer
        announcer={selectedAnnouncer}
        isOpen={showDetailDrawer}
        onClose={handleCloseDrawer}
        onStatusToggle={(announcerId, currentStatus) => {
          const announcer = displayAnnouncers.find(
            (a: Announcer) => a.id === announcerId,
          );
          if (announcer) {
            handleStatusToggle(announcer);
          }
          setShowDetailDrawer(false);
        }}
        onEdit={handleEdit}
      />
    </div>
  );
}
