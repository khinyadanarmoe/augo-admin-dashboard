import React, { useState, useEffect } from "react";
import { Announcement } from "@/types/export";
import {
  getAnnouncementStatusColor,
  formatAnnouncementStatus,
} from "@/utils/announcementUtils";
import { useStorageUrl } from "@/lib/storageUtils";
import { fetchAnnouncerById } from "@/lib/firestore/announcers";

// Component to display individual photo (needed for hook usage)
function AnnouncementPhoto({
  photoPath,
  onClick,
}: {
  photoPath: string;
  onClick?: () => void;
}) {
  const { url: photoUrl, loading } = useStorageUrl(photoPath);

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!photoUrl) {
    return null;
  }

  return (
    <img
      src={photoUrl}
      alt="Announcement photo"
      className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    />
  );
}

// Component to display announcer profile picture
function AnnouncerProfilePicture({
  announcerUID,
  announcerName,
}: {
  announcerUID: string;
  announcerName: string;
}) {
  const [profilePicturePath, setProfilePicturePath] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const { url: profileUrl } = useStorageUrl(profilePicturePath || "");

  useEffect(() => {
    const loadAnnouncerProfile = async () => {
      try {
        const announcer = await fetchAnnouncerById(announcerUID);
        if (announcer?.profilePicture) {
          setProfilePicturePath(announcer.profilePicture);
        }
      } catch (error) {
        console.error("Error loading announcer profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncerProfile();
  }, [announcerUID]);

  if (loading) {
    return (
      <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  if (profileUrl) {
    return (
      <img
        src={profileUrl}
        alt={`${announcerName}'s profile`}
        className="w-20 h-20 object-cover rounded-lg"
      />
    );
  }

  // Fallback to initials
  return (
    <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
      <span className="text-xl font-bold text-purple-600 dark:text-purple-300">
        {announcerName
          ? announcerName
              .split(" ")
              .map((n) => n[0])
              .join("")
          : "A"}
      </span>
    </div>
  );
}

// Simple Carousel Component
function PhotoCarousel({
  photoPaths,
  onPhotoClick,
}: {
  photoPaths: string[];
  onPhotoClick?: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? photoPaths.length - 1 : prevIndex - 1,
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === photoPaths.length - 1 ? 0 : prevIndex + 1,
    );
  };

  return (
    <div className="relative">
      <AnnouncementPhoto
        photoPath={photoPaths[currentIndex]}
        onClick={() => onPhotoClick?.(currentIndex)}
      />

      {/* Previous Button */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        aria-label="Previous photo"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Next Button */}
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        aria-label="Next photo"
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {photoPaths.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex
                ? "bg-white"
                : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to photo ${index + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
        {currentIndex + 1} / {photoPaths.length}
      </div>
    </div>
  );
}

// Full Screen Photo Modal
function FullScreenPhotoModal({
  photoPath,
  isOpen,
  onClose,
}: {
  photoPath: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { url: photoUrl, loading } = useStorageUrl(photoPath);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        aria-label="Close"
      >
        <svg
          className="w-8 h-8"
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

      {/* Photo Container */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-white text-lg">Loading...</div>
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt="Full screen announcement photo"
            className="max-w-full max-h-[90vh] object-contain"
          />
        ) : null}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        Click anywhere to close
      </div>
    </div>
  );
}

interface AnnouncementDetailDrawerProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (announcementId: string) => void;
  onDelete?: (announcementId: string) => void;
  onApprove?: (announcementId: string) => void;
  onReject?: (announcementId: string) => void;
}

export default function AnnouncementDetailDrawer({
  announcement,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: AnnouncementDetailDrawerProps) {
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);

  if (!isOpen || !announcement) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
            Announcement Details
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
          {/* Announcer Info Card - Same style as User Management */}
          {announcement.createdByUID && (
            <div className="flex items-center space-x-4 mb-4">
              {/* Profile Picture - Left Side */}
              <div className="relative shrink-0">
                <AnnouncerProfilePicture
                  announcerUID={announcement.createdByUID}
                  announcerName={announcement.createdByName || "Announcer"}
                />
              </div>

              {/* Announcer Info - Right Side */}
              <div className="flex-1 min-w-0 h-20 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {announcement.createdByName || "N/A"}
                </h3>

                {/* Basic Details */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      Email:
                    </span>
                    <span className="text-gray-900 dark:text-white text-right truncate max-w-50">
                      {announcement.createdByEmail || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      Department:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {announcement.department}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <div className="relative bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">
                {announcement.title}
              </h3>
              {announcement.isUrgent && (
                <span className="absolute bottom-2 right-2 text-xs font-medium text-red-600 dark:text-red-400">
                  Urgent
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          {announcement.body && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Body
              </label>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                {announcement.body}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photos
              {announcement.photoPaths &&
                announcement.photoPaths.length > 0 && (
                  <span className="ml-1">
                    ({announcement.photoPaths.length})
                  </span>
                )}
            </label>
            {!announcement.photoPaths ||
            announcement.photoPaths.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Photo is not provided
                </p>
              </div>
            ) : announcement.photoPaths.length === 1 ? (
              <AnnouncementPhoto
                photoPath={announcement.photoPaths[0]}
                onClick={() => setFullScreenPhoto(announcement.photoPaths![0])}
              />
            ) : (
              <PhotoCarousel
                photoPaths={announcement.photoPaths}
                onPhotoClick={(index) =>
                  setFullScreenPhoto(announcement.photoPaths![index])
                }
              />
            )}
          </div>

          {/* Other Details */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getAnnouncementStatusColor(announcement.status)}`}
                >
                  {formatAnnouncementStatus(announcement.status)}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.startDate.toString())}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.endDate.toString())}
                </p>
              </div>
            </div>

            {announcement.link && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Link
                </label>
                <a
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline bg-gray-50 dark:bg-gray-700 p-2 rounded block truncate"
                >
                  {announcement.link}
                </a>
              </div>
            )}

            {announcement.latitude && announcement.longitude && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location (Lat/Long)
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {announcement.latitude.toFixed(5)},{" "}
                  {announcement.longitude.toFixed(5)}
                </p>
              </div>
            )}

            {(announcement.likeCount !== undefined ||
              announcement.dislikeCount !== undefined) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Likes
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {announcement.likeCount || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dislikes
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {announcement.dislikeCount || 0}
                  </p>
                </div>
              </div>
            )}

            {announcement.submittedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Submitted At
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.submittedAt.toString())}
                </p>
              </div>
            )}

            {announcement.rejectedAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Declined At
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {formatDate(announcement.rejectedAt.toString())}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {announcement.status === "pending" && (
              <div className="grid grid-cols-2 gap-3">
                {onApprove && (
                  <button
                    onClick={() => onApprove(announcement.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(announcement.id)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Decline
                  </button>
                )}
              </div>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(announcement.id)}
                className="w-full px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Edit Announcement
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(announcement.id)}
                className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete Announcement
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Photo Modal */}
      {fullScreenPhoto && (
        <FullScreenPhotoModal
          photoPath={fullScreenPhoto}
          isOpen={!!fullScreenPhoto}
          onClose={() => setFullScreenPhoto(null)}
        />
      )}
    </>
  );
}
