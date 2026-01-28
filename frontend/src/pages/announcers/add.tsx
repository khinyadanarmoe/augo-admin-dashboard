import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { addAnnouncer, updateAnnouncer, updateAnnouncerProfilePicture } from "@/lib/firestore/announcers";
import { AFFILIATION_TYPES } from "@/types/export";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";
import bcrypt from "bcryptjs";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface AnnouncerFormData {
  name: string;
  email: string;
  affiliation_type: string;
  affiliation_name: string;
  role: string;
  password: string;
  phone: string;
  profilePicture: File | null;
}

function AddAnnouncer() {
  const router = useRouter();
  const { query } = router;
  const isEditMode = query.edit === 'true';
  
  const [formData, setFormData] = useState<AnnouncerFormData>({
    name: '',
    email: '',
    affiliation_type: '',
    affiliation_name: '',
    role: '',
    password: '',
    phone: '',
    profilePicture: null
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load data when in edit mode
  useEffect(() => {
    if (isEditMode && query.id) {
      setFormData({
        name: (query.name as string) || '',
        email: (query.email as string) || '',
        affiliation_type: (query.affiliation_type as string) || '',
        affiliation_name: (query.affiliation_name as string) || '',
        role: (query.role as string) || '',
        password: '', // Don't populate password in edit mode
        phone: (query.phone as string) || '',
        profilePicture: null
      });
    }
  }, [isEditMode, query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profilePicture: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Compression failed'));
            },
            'image/jpeg',
            0.8
          );
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadProfilePicture = async (file: File, announcerId: string): Promise<string> => {
    try {
      console.log('Starting image compression...');
      // Compress image before upload
      const compressedBlob = await compressImage(file);
      console.log('Image compressed, size:', compressedBlob.size);
      
      const storageRef = ref(storage, `announcers/${announcerId}/profile.jpg`);
      console.log('Uploading to Firebase Storage...');
      
      // Add timeout protection (30 seconds)
      const uploadPromise = uploadBytes(storageRef, compressedBlob);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout - check Firebase Storage rules')), 30000)
      );
      
      await Promise.race([uploadPromise, timeoutPromise]);
      console.log('Upload complete, getting download URL...');
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);
      return downloadURL;
    } catch (error: any) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate required fields - password not required in edit mode if not changing it
      if (!formData.name || !formData.email || !formData.affiliation_type || !formData.affiliation_name) {
        alert('Please fill in all required fields');
        setIsLoading(false);
        return;
      }

      // In create mode, password is required
      if (!isEditMode && !formData.password) {
        alert('Password is required');
        setIsLoading(false);
        return;
      }

      if (isEditMode && query.id) {
        // Update existing announcer
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          affiliation_name: formData.affiliation_name,
          affiliation_type: formData.affiliation_type,
          phone: formData.phone,
          role: formData.role
        };

        // Upload profile picture if a new one is selected
        if (formData.profilePicture) {
          try {
            console.log('Uploading profile picture for edit mode...');
            const imageUrl = await uploadProfilePicture(formData.profilePicture, query.id as string);
            updateData.profilePicture = imageUrl;
          } catch (error: any) {
            console.error('Failed to upload image:', error);
            alert(`Failed to upload image: ${error.message}. The announcer will be updated without the new image.`);
            // Continue with update even if image upload fails
          }
        }

        // Only hash and update password if a new one is provided
        if (formData.password && formData.password.trim() !== '') {
          const salt = await bcrypt.genSalt(6); // Reduced from 10 to 6 for faster processing
          const hashedPassword = await bcrypt.hash(formData.password, salt);
          updateData.password = hashedPassword;
        }

        await updateAnnouncer(query.id as string, updateData);
        console.log('Announcer updated with ID:', query.id);
        alert('Announcer updated successfully!');
      } else {
        // Create new announcer
        // Hash the password before saving
        const salt = await bcrypt.genSalt(6); // Reduced from 10 to 6 for faster processing
        const hashedPassword = await bcrypt.hash(formData.password, salt);

        const newAnnouncerId = await addAnnouncer({
          name: formData.name,
          email: formData.email,
          affiliation_name: formData.affiliation_name,
          affiliation_type: formData.affiliation_type,
          phone: formData.phone,
          role: formData.role,
          password: hashedPassword
        });

        // Upload profile picture if provided
        if (formData.profilePicture) {
          const imageUrl = await uploadProfilePicture(formData.profilePicture, newAnnouncerId);
          // Only update the profilePicture field
          await updateAnnouncerProfilePicture(newAnnouncerId, imageUrl);
        }
        
        console.log('New announcer created with ID:', newAnnouncerId);
        alert('Announcer created successfully!');
      }
      
      // Redirect back to announcers list
      router.push('/announcers');
    } catch (error) {
      console.error('Error saving announcer:', error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} announcer. Please try again.`);
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
          <div className="max-w-2xl mx-auto">
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
                <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Announcer' : 'Add New Announcer'}</h1>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {isEditMode ? 'Update announcer profile information' : 'Create a new announcer profile with all required information'}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {/* Profile Picture Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 text-center">
                  Profile Picture
                </label>
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                      {previewImage ? (
                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <div className="text-center">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    {/* Edit Icon */}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="profilePicture"
                    />
                    <label
                      htmlFor="profilePicture"
                      className="absolute -bottom-2 -right-2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg"
                      title="Edit picture"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                    JPG, PNG or GIF (max. 2MB)
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter full name"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password {isEditMode ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!isEditMode}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={isEditMode ? "Enter new password (or leave blank)" : "Enter password"}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type *
                  </label>
                  <select
                    name="affiliation_type"
                    value={formData.affiliation_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Type</option>
                    {Object.values(AFFILIATION_TYPES).map((type: string) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Affiliation Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Affiliation Name *
                  </label>
                  <input
                    type="text"
                    name="affiliation_name"
                    value={formData.affiliation_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Computer Science Department, AU Student Union, Registration Office"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., PR Assistant, Dean, President, Administrator"
                  />
                </div>
              </div>



              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                      : (isEditMode ? 'Update Announcer' : 'Create Announcer')
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

export default withAdminAuth(AddAnnouncer);