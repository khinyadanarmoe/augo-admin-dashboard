import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import {
  addARSpawn,
  updateARSpawn,
  ARSpawnData,
  SpawnLocation,
} from "@/lib/firestore/arSpawns";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useStorageUrl } from "@/lib/storageUtils";
import { AR_RARITY, RARITY_CATCHABLE_RANGES } from "@/types/constants";
import dynamic from "next/dynamic";
import { useToast } from "@/contexts/ToastContext";

// Dynamically import map component to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-100 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading map...</div>
    </div>
  ),
});

interface ARModelFormData {
  name: string;
  slug: string;
  category: string;
  description: string;
  latitude: number | string;
  longitude: number | string;
  catchRadius: number;
  revealRadius: number;
  rarity: string;
  catchable_time: number;
  coin_value: number;
  point: number;
  status: "active" | "inactive" | "scheduled";
  startTime: string;
  endTime: string;
  modelFile: File | null;
  previewFile: File | null;
}

const DEFAULT_LOCATION = {
  lat: 13.6135451, // Assumption University coordinates
  lng: 100.8430599,
};

function AddARModel() {
  const router = useRouter();
  const { query } = router;
  const toast = useToast();
  const isEditMode = query.edit === "true";
  const isDuplicateMode = query.duplicate === "true";

  const [formData, setFormData] = useState<ARModelFormData>({
    name: "",
    slug: "",
    category: "",
    description: "",
    latitude: DEFAULT_LOCATION.lat,
    longitude: DEFAULT_LOCATION.lng,
    catchRadius: 8,
    revealRadius: 30,
    rarity: "",
    catchable_time: 100,
    coin_value: 0.2,
    point: 10,
    status: "active",
    startTime: "",
    endTime: "",
    modelFile: null,
    previewFile: null,
  });

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [existingModelPath, setExistingModelPath] = useState<string>("");
  const [existingPreviewPath, setExistingPreviewPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [spawnMode, setSpawnMode] = useState<"fixed" | "zone" | "random">(
    "fixed",
  );
  const [fixedLocations, setFixedLocations] = useState<SpawnLocation[]>([]);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number>(0);

  // Convert existing preview path to download URL
  const { url: existingPreviewUrl } = useStorageUrl(existingPreviewPath);

  // Load data when in edit mode
  useEffect(() => {
    if (isEditMode && query.id) {
      setFormData({
        name: (query.name as string) || "",
        slug: (query.slug as string) || "",
        category: (query.category as string) || "",
        description: (query.description as string) || "",
        latitude: parseFloat(query.latitude as string) || DEFAULT_LOCATION.lat,
        longitude:
          parseFloat(query.longitude as string) || DEFAULT_LOCATION.lng,
        catchRadius: parseInt(query.catchRadius as string) || 8,
        revealRadius: parseInt(query.revealRadius as string) || 30,
        rarity: (query.rarity as string) || "",
        catchable_time: parseInt(query.catchable_time as string) || 100,
        coin_value: parseFloat(query.coin_value as string) || 0.2,
        point: parseInt(query.point as string) || 10,
        status:
          (query.status as "active" | "inactive" | "scheduled") || "active",
        startTime: (query.startTime as string) || "",
        endTime: (query.endTime as string) || "",
        modelFile: null,
        previewFile: null,
      });

      setExistingModelPath((query.modelPath as string) || "");
      setExistingPreviewPath((query.previewPath as string) || "");

      // Load spawn mode and fixed locations
      setSpawnMode((query.spawnMode as "fixed" | "zone" | "random") || "fixed");
      if (query.fixedLocations) {
        try {
          const locations = JSON.parse(query.fixedLocations as string);
          setFixedLocations(locations);
        } catch (e) {
          console.error("Failed to parse fixedLocations:", e);
        }
      }

      // Don't set previewImageUrl here - it will be set by the useStorageUrl hook above

      // Trigger map re-render with new coordinates
      setMapKey((prev) => prev + 1);
    }
  }, [isEditMode, query]);

  // Load data when in duplicate mode (all fields except location)
  useEffect(() => {
    if (isDuplicateMode) {
      setFormData({
        name: (query.name as string) || "",
        slug: (query.slug as string) || "",
        category: (query.category as string) || "",
        description: (query.description as string) || "",
        latitude: DEFAULT_LOCATION.lat, // Reset to default location
        longitude: DEFAULT_LOCATION.lng, // Reset to default location
        catchRadius: parseInt(query.catchRadius as string) || 8,
        revealRadius: parseInt(query.revealRadius as string) || 30,
        rarity: (query.rarity as string) || "",
        catchable_time: parseInt(query.catchable_time as string) || 100,
        coin_value: parseFloat(query.coin_value as string) || 0.2,
        point: parseInt(query.point as string) || 10,
        status:
          (query.status as "active" | "inactive" | "scheduled") || "active",
        startTime: (query.startTime as string) || "",
        endTime: (query.endTime as string) || "",
        modelFile: null,
        previewFile: null,
      });

      // Reuse existing model and preview files
      setExistingModelPath((query.modelPath as string) || "");
      setExistingPreviewPath((query.previewPath as string) || "");

      // Trigger map re-render with default coordinates
      setMapKey((prev) => prev + 1);
    }
  }, [isDuplicateMode, query]);

  // Update preview image URL when the storage URL is loaded
  useEffect(() => {
    if (existingPreviewUrl && !previewImageUrl) {
      setPreviewImageUrl(existingPreviewUrl);
    }
  }, [existingPreviewUrl, previewImageUrl]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    // If rarity is changed, reset catchable_time to fit within range
    if (name === "rarity" && value) {
      const range =
        RARITY_CATCHABLE_RANGES[value as keyof typeof RARITY_CATCHABLE_RANGES];
      setFormData((prev) => ({
        ...prev,
        rarity: value,
        catchable_time: range.min,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        e.target instanceof HTMLInputElement && e.target.type === "number"
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        previewFile: file,
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        modelFile: file,
      }));
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    if (spawnMode === "fixed" && fixedLocations.length > 0) {
      // Update the selected spawn location
      const updated = [...fixedLocations];
      updated[selectedLocationIndex] = {
        ...updated[selectedLocationIndex],
        latitude: lat,
        longitude: lng,
      };
      setFixedLocations(updated);
    } else {
      // Update main/default location
      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
      }));
    }
  };

  const handleAddSpawnLocation = () => {
    const newLocation: SpawnLocation = {
      latitude:
        typeof formData.latitude === "string"
          ? parseFloat(formData.latitude)
          : formData.latitude,
      longitude:
        typeof formData.longitude === "string"
          ? parseFloat(formData.longitude)
          : formData.longitude,
      name: `Spawn Point ${fixedLocations.length + 1}`,
    };
    setFixedLocations([...fixedLocations, newLocation]);
    setSelectedLocationIndex(fixedLocations.length);
  };

  const handleRemoveSpawnLocation = (index: number) => {
    const updated = fixedLocations.filter((_, i) => i !== index);
    setFixedLocations(updated);
    if (selectedLocationIndex >= updated.length) {
      setSelectedLocationIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleLocationNameChange = (index: number, name: string) => {
    const updated = [...fixedLocations];
    updated[index] = { ...updated[index], name };
    setFixedLocations(updated);
  };

  const handleSelectLocation = (index: number) => {
    setSelectedLocationIndex(index);
    const location = fixedLocations[index];
    setFormData((prev) => ({
      ...prev,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
    setMapKey((prev) => prev + 1);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      // Return storage path instead of URL
      return path;
    } catch (error: any) {
      console.error("File upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (
        !formData.name ||
        !formData.slug ||
        !formData.category ||
        !formData.description ||
        !formData.rarity
      ) {
        toast.warning("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      // Validate catchable_time is within rarity range
      const rarityRange =
        RARITY_CATCHABLE_RANGES[
          formData.rarity as keyof typeof RARITY_CATCHABLE_RANGES
        ];
      if (
        rarityRange &&
        (formData.catchable_time < rarityRange.min ||
          formData.catchable_time > rarityRange.max)
      ) {
        toast.error(
          `Catchable time must be between ${rarityRange.min} and ${rarityRange.max} for ${formData.rarity} rarity`,
        );
        setIsLoading(false);
        return;
      }

      // In create mode, files are required
      if (!isEditMode && (!formData.modelFile || !formData.previewFile)) {
        toast.warning("Please upload both 3D model and preview image");
        setIsLoading(false);
        return;
      }

      let modelPathValue = existingModelPath;
      let previewPathValue = existingPreviewPath;

      // Generate unique timestamp for file paths
      const fileTimestamp = Date.now();

      // Upload model file if provided
      if (formData.modelFile) {
        const fileExtension = formData.modelFile.name.split(".").pop();
        const modelPath = `3d_models/ar/${formData.category}/${formData.slug}/${fileTimestamp}.${fileExtension}`;
        modelPathValue = await uploadFile(formData.modelFile, modelPath);
        console.log("Model uploaded to:", modelPathValue);
      }

      // Upload preview image if provided
      if (formData.previewFile) {
        const previewFilePath = `3d_models/ar/${formData.category}/${formData.slug}/preview.png`;
        previewPathValue = await uploadFile(
          formData.previewFile,
          previewFilePath,
        );
        console.log("Preview uploaded to:", previewPathValue);
      }

      // Auto-calculate status based on time fields
      let calculatedStatus: "active" | "inactive" | "scheduled";
      const now = new Date();
      const startTime = formData.startTime
        ? new Date(formData.startTime)
        : null;
      const endTime = formData.endTime ? new Date(formData.endTime) : null;

      if (startTime || endTime) {
        // Has time constraints
        if (startTime && now < startTime) {
          calculatedStatus = "scheduled"; // Not started yet
        } else if (endTime && now > endTime) {
          calculatedStatus = "inactive"; // Ended
        } else {
          calculatedStatus = "active"; // Currently within time range
        }
      } else {
        // No time constraints - always active
        calculatedStatus = "active";
      }

      const modelData: Omit<ARSpawnData, "id" | "createdAt" | "updatedAt"> = {
        name: formData.name,
        slug: formData.slug,
        category: formData.category,
        description: formData.description,
        modelPath: modelPathValue,
        previewPath: previewPathValue,
        latitude:
          typeof formData.latitude === "string"
            ? parseFloat(formData.latitude)
            : formData.latitude,
        longitude:
          typeof formData.longitude === "string"
            ? parseFloat(formData.longitude)
            : formData.longitude,
        spawnMode: spawnMode,
        ...(fixedLocations.length > 0 && { fixedLocations }),
        catchRadius: formData.catchRadius,
        revealRadius: formData.revealRadius,
        rarity: formData.rarity,
        catchable_time: formData.catchable_time,
        coin_value: formData.coin_value,
        point: formData.point,
        status: calculatedStatus,
        isActive: calculatedStatus === "active",
        ...(formData.startTime && { startTime: formData.startTime }),
        ...(formData.endTime && { endTime: formData.endTime }),
      };

      if (isEditMode && query.id) {
        await updateARSpawn(query.id as string, modelData);
        console.log("AR model updated with ID:", query.id);
        toast.success("AR model updated successfully!");
      } else {
        const newModelId = await addARSpawn(modelData);
        console.log("New AR model created with ID:", newModelId);
        toast.success("AR model created successfully!");
      }

      // Redirect back to AR models list
      router.push("/ar-models");
    } catch (error) {
      console.error("Error saving AR model:", error);
      toast.error(
        `Failed to ${isEditMode ? "update" : "create"} AR model. Please try again.`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-purple-50/30 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-8">
              <button
                onClick={handleCancel}
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold">
                  {isEditMode ? "Edit AR Model" : "Add New AR Model"}
                </h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {isEditMode
                    ? "Update AR model information and location"
                    : "Upload a new 3D model and set its spawn location"}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Basic Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Nervous Monster"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Slug *
                    </label>
                    <input
                      type="text"
                      name="slug"
                      value={formData.slug}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., nervous_monster"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      URL-friendly identifier (lowercase, no spaces)
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select category</option>
                      <option value="special_char">Special Character</option>
                      <option value="monsters">Monsters</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter a description of the AR model..."
                    />
                  </div>
                </div>
              </div>

              {/* File Uploads Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Files</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Preview Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preview Image {!isEditMode && "*"}
                    </label>
                    <div className="space-y-3">
                      <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
                        {previewImageUrl ? (
                          <img
                            src={previewImageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <svg
                              className="w-12 h-12 text-gray-400 mx-auto mb-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-sm text-gray-500">
                              No preview image
                            </span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePreviewFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900 dark:file:text-purple-300"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        JPG, PNG (recommended: 512x512px)
                      </p>
                    </div>
                  </div>

                  {/* 3D Model File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      3D Model File {!isEditMode && "*"}
                    </label>
                    <div className="space-y-3">
                      <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        <div className="text-center">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto mb-2"
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
                          <span className="text-sm text-gray-500">
                            {formData.modelFile
                              ? formData.modelFile.name
                              : existingModelPath
                                ? "Current file: " +
                                  existingModelPath.split("/").pop()
                                : "No file selected"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept=".usdz,.glb,.gltf"
                        onChange={handleModelFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900 dark:file:text-purple-300"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        USDZ, GLB, or GLTF format
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Availability Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Time Availability
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Set when this AR model should be available for users to catch.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      When the AR model becomes available
                    </p>
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      When the AR model stops being available
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Spawn Location</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Latitude *
                      </label>
                      <input
                        type="text"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., 13.6135451"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Longitude *
                      </label>
                      <input
                        type="text"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., 100.8430599"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Multiple Spawn Locations Management */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Spawn Locations ({fixedLocations.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddSpawnLocation}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Add Location
                      </button>
                    </div>

                    {fixedLocations.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                        {fixedLocations.map((location, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                              selectedLocationIndex === index
                                ? "bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500"
                                : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectLocation(index)}
                              className="flex-1 text-left"
                            >
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {location.name || `Spawn Point ${index + 1}`}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {location.latitude.toFixed(6)},{" "}
                                {location.longitude.toFixed(6)}
                              </div>
                            </button>
                            <input
                              type="text"
                              value={location.name || ""}
                              onChange={(e) =>
                                handleLocationNameChange(index, e.target.value)
                              }
                              placeholder={`Location ${index + 1}`}
                              className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSpawnLocation(index)}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Remove location"
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
                        ))}
                      </div>
                    )}

                    {fixedLocations.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        No spawn locations added yet. Click "Add Location" to
                        add the first spawn point, or use the single location
                        below.
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <MapPicker
                      key={mapKey}
                      latitude={
                        typeof formData.latitude === "string"
                          ? parseFloat(formData.latitude) || 0
                          : formData.latitude
                      }
                      longitude={
                        typeof formData.longitude === "string"
                          ? parseFloat(formData.longitude) || 0
                          : formData.longitude
                      }
                      onLocationChange={handleLocationChange}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {fixedLocations.length > 0
                      ? `Click on the map to update the selected spawn location (${fixedLocations[selectedLocationIndex]?.name || `Spawn Point ${selectedLocationIndex + 1}`})`
                      : "Click on the map to set the spawn location (single spawn point)"}
                  </p>
                </div>
              </div>

              {/* Game Parameters Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Game Parameters</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rarity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rarity *
                    </label>
                    <select
                      name="rarity"
                      value={formData.rarity}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select rarity</option>
                      {Object.entries(RARITY_CATCHABLE_RANGES).map(
                        ([rarity, info]) => (
                          <option key={rarity} value={rarity}>
                            {rarity} - Catchable:{" "}
                            {info.min === info.max
                              ? info.min
                              : `${info.min}-${info.max}`}{" "}
                            time{info.max > 1 ? "s" : ""}
                          </option>
                        ),
                      )}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Determines how many times this AR model can be caught
                    </p>
                  </div>

                  {/* Catchable Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catchable Times (counts) *
                    </label>
                    <input
                      type="number"
                      name="catchable_time"
                      value={formData.catchable_time}
                      onChange={handleInputChange}
                      min={
                        formData.rarity
                          ? RARITY_CATCHABLE_RANGES[
                              formData.rarity as keyof typeof RARITY_CATCHABLE_RANGES
                            ]?.min
                          : 1
                      }
                      max={
                        formData.rarity
                          ? RARITY_CATCHABLE_RANGES[
                              formData.rarity as keyof typeof RARITY_CATCHABLE_RANGES
                            ]?.max
                          : 999999
                      }
                      required
                      disabled={!formData.rarity}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formData.rarity
                        ? `Range for ${formData.rarity}: ${RARITY_CATCHABLE_RANGES[formData.rarity as keyof typeof RARITY_CATCHABLE_RANGES]?.min}-${RARITY_CATCHABLE_RANGES[formData.rarity as keyof typeof RARITY_CATCHABLE_RANGES]?.max}`
                        : "Select rarity first to set catchable time range"}
                    </p>
                  </div>

                  {/* Catch Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catch Radius (meters) *
                    </label>
                    <input
                      type="number"
                      name="catchRadius"
                      value={formData.catchRadius}
                      onChange={handleInputChange}
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Distance within which users can catch the monster
                    </p>
                  </div>

                  {/* Reveal Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reveal Radius (meters) *
                    </label>
                    <input
                      type="number"
                      name="revealRadius"
                      value={formData.revealRadius}
                      onChange={handleInputChange}
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Distance at which the monster becomes visible
                    </p>
                  </div>

                  {/* Points */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Points Reward *
                    </label>
                    <input
                      type="number"
                      name="point"
                      value={formData.point}
                      onChange={handleInputChange}
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Points earned when caught
                    </p>
                  </div>

                  {/* Coin Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Coin Value *
                    </label>
                    <input
                      type="number"
                      name="coin_value"
                      value={formData.coin_value}
                      onChange={handleInputChange}
                      min="0"
                      step="0.1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Coins earned when caught
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
                >
                  {isLoading && (
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                  <span>
                    {isLoading
                      ? isEditMode
                        ? "Updating..."
                        : "Creating..."
                      : isEditMode
                        ? "Update Model"
                        : "Create Model"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(AddARModel);
