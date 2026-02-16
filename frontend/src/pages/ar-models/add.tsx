import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { addARSpawn, updateARSpawn, ARSpawnData } from "@/lib/firestore/arSpawns";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";
import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const MapPicker = dynamic(() => import('@/components/MapPicker'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-100 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
      <div className="text-gray-500 dark:text-gray-400">Loading map...</div>
    </div>
  )
});

interface ARModelFormData {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  catchRadius: number;
  revealRadius: number;
  catchable_time: number;
  coin_value: number;
  point: number;
  isActive: boolean;
  modelFile: File | null;
  previewFile: File | null;
}

const DEFAULT_LOCATION = {
  lat: 13.6135451, // Assumption University coordinates
  lng: 100.8430599
};

function AddARModel() {
  const router = useRouter();
  const { query } = router;
  const isEditMode = query.edit === 'true';
  
  const [formData, setFormData] = useState<ARModelFormData>({
    title: '',
    description: '',
    latitude: DEFAULT_LOCATION.lat,
    longitude: DEFAULT_LOCATION.lng,
    catchRadius: 8,
    revealRadius: 30,
    catchable_time: 100,
    coin_value: 0.2,
    point: 10,
    isActive: true,
    modelFile: null,
    previewFile: null
  });
  
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [existingModelPath, setExistingModelPath] = useState<string>('');
  const [existingPreviewPath, setExistingPreviewPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Load data when in edit mode
  useEffect(() => {
    if (isEditMode && query.id) {
      setFormData({
        title: (query.title as string) || '',
        description: (query.description as string) || '',
        latitude: parseFloat(query.latitude as string) || DEFAULT_LOCATION.lat,
        longitude: parseFloat(query.longitude as string) || DEFAULT_LOCATION.lng,
        catchRadius: parseInt(query.catchRadius as string) || 8,
        revealRadius: parseInt(query.revealRadius as string) || 30,
        catchable_time: parseInt(query.catchable_time as string) || 100,
        coin_value: parseFloat(query.coin_value as string) || 0.2,
        point: parseInt(query.point as string) || 10,
        isActive: query.isActive === 'true',
        modelFile: null,
        previewFile: null
      });
      
      setExistingModelPath((query.assetPath as string) || '');
      setExistingPreviewPath((query.preview as string) || '');
      setPreviewImageUrl((query.preview as string) || null);
      
      // Trigger map re-render with new coordinates
      setMapKey(prev => prev + 1);
    }
  }, [isEditMode, query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        previewFile: file
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
      setFormData(prev => ({
        ...prev,
        modelFile: file
      }));
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      // Return storage path instead of URL
      return path;
    } catch (error: any) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!formData.title || !formData.description) {
        alert('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      // In create mode, files are required
      if (!isEditMode && (!formData.modelFile || !formData.previewFile)) {
        alert('Please upload both 3D model and preview image');
        setIsLoading(false);
        return;
      }

      let assetPath = existingModelPath;
      let previewPath = existingPreviewPath;

      // Generate unique ID for file paths
      const modelId = query.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload model file if provided
      if (formData.modelFile) {
        const fileExtension = formData.modelFile.name.split('.').pop();
        const modelPath = `3d_models/ar/monsters/${modelId}.${fileExtension}`;
        assetPath = await uploadFile(formData.modelFile, modelPath);
        console.log('Model uploaded to:', assetPath);
      }

      // Upload preview image if provided
      if (formData.previewFile) {
        const previewFilePath = `3d_models/ar/monsters/preview_photo/${modelId}.jpg`;
        previewPath = await uploadFile(formData.previewFile, previewFilePath);
        console.log('Preview uploaded to:', previewPath);
      }

      const modelData: Omit<ARSpawnData, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description,
        assetPath,
        preview: previewPath,
        latitude: formData.latitude,
        longitude: formData.longitude,
        catchRadius: formData.catchRadius,
        revealRadius: formData.revealRadius,
        catchable_time: formData.catchable_time,
        coin_value: formData.coin_value,
        point: formData.point,
        isActive: formData.isActive
      };

      if (isEditMode && query.id) {
        await updateARSpawn(query.id as string, modelData);
        console.log('AR model updated with ID:', query.id);
        alert('AR model updated successfully!');
      } else {
        const newModelId = await addARSpawn(modelData);
        console.log('New AR model created with ID:', newModelId);
        alert('AR model created successfully!');
      }
      
      // Redirect back to AR models list
      router.push('/ar-models');
    } catch (error) {
      console.error('Error saving AR model:', error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} AR model. Please try again.`);
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold">{isEditMode ? 'Edit AR Model' : 'Add New AR Model'}</h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {isEditMode ? 'Update AR model information and location' : 'Upload a new 3D model and set its spawn location'}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., Nervous Monster"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
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

                  {/* Active Status */}
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Active (visible to users)
                      </span>
                    </label>
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
                      Preview Image {!isEditMode && '*'}
                    </label>
                    <div className="space-y-3">
                      <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
                        {previewImageUrl ? (
                          <img src={previewImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-gray-500">No preview image</span>
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
                      3D Model File {!isEditMode && '*'}
                    </label>
                    <div className="space-y-3">
                      <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        <div className="text-center">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="text-sm text-gray-500">
                            {formData.modelFile 
                              ? formData.modelFile.name 
                              : existingModelPath 
                                ? 'Current file: ' + existingModelPath.split('/').pop()
                                : 'No file selected'}
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
                        type="number"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        step="0.000001"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        step="0.000001"
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                    <MapPicker
                      key={mapKey}
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onLocationChange={handleLocationChange}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click on the map to set the spawn location
                  </p>
                </div>
              </div>

              {/* Game Parameters Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Game Parameters</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Catchable Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catchable Time (seconds) *
                    </label>
                    <input
                      type="number"
                      name="catchable_time"
                      value={formData.catchable_time}
                      onChange={handleInputChange}
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      How long users have to catch the monster
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
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <span>
                    {isLoading 
                      ? (isEditMode ? 'Updating...' : 'Creating...') 
                      : (isEditMode ? 'Update Model' : 'Create Model')
                    }
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
