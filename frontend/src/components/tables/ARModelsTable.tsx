import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  fetchARSpawns,
  deleteARSpawn,
  ARSpawnData,
} from "@/lib/firestore/arSpawns";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useStorageUrl } from "@/lib/storageUtils";
import { RARITY_CATCHABLE_RANGES } from "@/types/constants";
import { useToast } from "@/contexts/ToastContext";
import {
  SortableTableHeader,
  RegularTableHeader,
} from "@/components/ui/SortableTableHeader";

interface ARModelsTableProps {
  initialSearchTerm?: string;
}

interface ARModelRowProps {
  model: ARSpawnData;
  onEdit: (modelId: string) => void;
  onDelete: (modelId: string) => void;
  formatCoordinates: (lat: number, lng: number) => string;
}

// Separate component to properly use useStorageUrl hook
function ARModelRow({
  model,
  onEdit,
  onDelete,
  formatCoordinates,
}: ARModelRowProps) {
  const { url: previewUrl } = useStorageUrl(model.previewPath);

  // Get rarity text color based on rarity type (no background)
  const getRarityColor = (rarity: string) => {
    const rarityColors: Record<string, string> = {
      "Ultra Rare": "text-cyan-600 dark:text-cyan-400",
      Rare: "text-blue-600 dark:text-blue-400",
      Uncommon: "text-green-600 dark:text-green-400",
      Common: "text-pink-600 dark:text-pink-400",
      "Very Common": "text-red-600 dark:text-red-400",
      Unlimited: "text-gray-600 dark:text-gray-400",
    };
    return rarityColors[rarity] || "text-gray-600 dark:text-gray-400";
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={model.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          {model.name}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            {model.category}
          </span>
          {model.rarity && <span className="text-xs">|</span>}
          {model.rarity ? (
            <span
              className={`text-xs font-medium ${getRarityColor(model.rarity)}`}
            >
              {model.rarity}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No rarity</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
          {model.description || "No description"}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          {model.fixedLocations && model.fixedLocations.length > 0 ? (
            <span className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {model.fixedLocations.length} spawn points
            </span>
          ) : (
            formatCoordinates(model.latitude, model.longitude)
          )}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Catch: {model.catchRadius}m | Reveal: {model.revealRadius}m
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">
          {model.point} pts | {model.coin_value} coins
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Catchable: {model.catchable_time}s
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {(() => {
          // Simple status display with icons
          let displayStatus = "";
          let icon = "";
          let colorClass = "";

          if (model.status === "active") {
            icon = "🟢";
            displayStatus = "Active";
            colorClass = "text-green-600 dark:text-green-400";
          } else if (model.status === "scheduled") {
            icon = "🟡";
            displayStatus = "Scheduled";
            colorClass = "text-yellow-600 dark:text-yellow-400";
          } else {
            icon = "⚫";
            displayStatus = "Inactive";
            colorClass = "text-gray-600 dark:text-gray-400";
          }

          return (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{icon}</span>
              <span className={`text-sm font-medium ${colorClass}`}>
                {displayStatus}
              </span>
            </div>
          );
        })()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(model.id!)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(model.id!)}
            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <svg
              className="w-5 h-5"
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
        </div>
      </td>
    </tr>
  );
}

export default function ARModelsTable({
  initialSearchTerm = "",
}: ARModelsTableProps) {
  const router = useRouter();
  const toast = useToast();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [arModels, setArModels] = useState<ARSpawnData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"point" | "coin_value" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    modelId: string;
    title: string;
  }>({
    isOpen: false,
    modelId: "",
    title: "",
  });

  useEffect(() => {
    loadARModels();
  }, []);

  const loadARModels = async () => {
    setLoading(true);
    try {
      const data = await fetchARSpawns();
      console.log("Fetched AR models:", data);
      setArModels(data);
    } catch (err) {
      console.error("Error fetching AR models:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Filter AR models
  let filteredModels = arModels.filter((model) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch =
      searchTerm === "" || model.name.toLowerCase().includes(searchLower);

    const categoryMatch =
      categoryFilter === "" || model.category === categoryFilter;

    const rarityMatch = rarityFilter === "" || model.rarity === rarityFilter;

    const statusMatch = statusFilter === "" || statusFilter === model.status;

    return nameMatch && categoryMatch && rarityMatch && statusMatch;
  });

  // Apply sorting if enabled
  if (sortBy) {
    filteredModels = [...filteredModels].sort((a, b) => {
      const valueA = a[sortBy];
      const valueB = b[sortBy];
      if (sortOrder === "asc") {
        return valueA - valueB;
      } else {
        return valueB - valueA;
      }
    });
  }

  const totalPages = Math.ceil(filteredModels.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedModels = filteredModels.slice(
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

  const handleSortByRewards = (field: "point" | "coin_value") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleEdit = (modelId: string) => {
    const model = arModels.find((m) => m.id === modelId);
    if (model) {
      router.push({
        pathname: "/ar-models/add",
        query: {
          edit: "true",
          id: model.id,
          ...model,
          // Serialize fixedLocations array as JSON string for URL
          fixedLocations: model.fixedLocations
            ? JSON.stringify(model.fixedLocations)
            : undefined,
        },
      });
    }
  };

  const handleDelete = (modelId: string) => {
    const model = arModels.find((m) => m.id === modelId);
    if (model) {
      setDeleteModal({
        isOpen: true,
        modelId: model.id!,
        title: model.name,
      });
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteARSpawn(deleteModal.modelId);
      await loadARModels();
      setDeleteModal({ isOpen: false, modelId: "", title: "" });
      toast.success("AR model deleted successfully");
    } catch (error) {
      console.error("Error deleting AR model:", error);
      toast.error("Failed to delete AR model");
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Get unique categories from AR models
  const uniqueCategories = Array.from(
    new Set(arModels.map((m) => m.category).filter(Boolean)),
  );

  // Get rarity options from constants
  const rarityOptions = Object.keys(RARITY_CATCHABLE_RANGES);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Rarity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rarity
            </label>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Rarities</option>
              {rarityOptions.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <RegularTableHeader
                label="Preview"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Name"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Description"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Location"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
              <SortableTableHeader
                field="point"
                label="Rewards"
                currentSortField={sortBy}
                sortOrder={sortOrder}
                onSort={handleSortByRewards}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Status"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
              <RegularTableHeader
                label="Actions"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              />
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                </td>
              </tr>
            ) : paginatedModels.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No AR models found
                </td>
              </tr>
            ) : (
              paginatedModels.map((model) => (
                <ARModelRow
                  key={model.id}
                  model={model}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  formatCoordinates={formatCoordinates}
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
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              {startIndex + 1}-
              {Math.min(startIndex + rowsPerPage, filteredModels.length)} of{" "}
              {filteredModels.length} rows
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="px-2 text-gray-700 dark:text-gray-300">
                  ...
                </span>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete{" "}
              <strong>{deleteModal.title}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, modelId: "", title: "" })
                }
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
