import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  fetchARSpawns,
  deleteARSpawn,
  ARSpawnData,
} from "@/lib/firestore/arSpawns";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface ARModelsTableProps {
  initialSearchTerm?: string;
}

export default function ARModelsTable({
  initialSearchTerm = "",
}: ARModelsTableProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const rowsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [arModels, setArModels] = useState<ARSpawnData[]>([]);
  const [loading, setLoading] = useState(false);
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
  const filteredModels = arModels.filter((model) => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch =
      searchTerm === "" ||
      model.title.toLowerCase().includes(searchLower) ||
      model.description?.toLowerCase().includes(searchLower) ||
      model.id?.toLowerCase().includes(searchLower);

    const statusMatch =
      statusFilter === "" ||
      (statusFilter === "active" && model.isActive) ||
      (statusFilter === "inactive" && !model.isActive);

    return titleMatch && statusMatch;
  });

  const totalPages = Math.ceil(filteredModels.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedModels = filteredModels.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
        title: model.title,
      });
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteARSpawn(deleteModal.modelId);
      await loadARModels();
      setDeleteModal({ isOpen: false, modelId: "", title: "" });
    } catch (error) {
      console.error("Error deleting AR model:", error);
      alert("Failed to delete AR model");
    }
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, description..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Preview
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rewards
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
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
                <tr
                  key={model.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {model.preview ? (
                        <img
                          src={model.preview}
                          alt={model.title}
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
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {model.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {model.description || "No description"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatCoordinates(model.latitude, model.longitude)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Catch: {model.catchRadius}m | Reveal: {model.revealRadius}
                      m
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
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        model.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                      }`}
                    >
                      {model.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(model.id!)}
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
                        onClick={() => handleDelete(model.id!)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + rowsPerPage, filteredModels.length)} of{" "}
            {filteredModels.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded-lg ${
                  currentPage === page
                    ? "bg-purple-600 text-white"
                    : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
