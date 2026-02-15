# AR Models Management System

This document describes the newly added AR Models management feature for the AUGo Admin panel.

## Overview

The AR Models management system allows administrators to upload and manage 3D AR models for the monster collection game. It includes features for:

- Uploading 3D models (USDZ, GLB, GLTF formats)
- Setting spawn locations via an interactive map
- Managing game parameters (catch radius, rewards, etc.)
- Preview image management
- Active/inactive status control

## Files Created

### 1. Firestore Module

- **Path**: `/frontend/src/lib/firestore/arSpawns.ts`
- **Purpose**: Handles all database operations for AR models
- **Functions**:
  - `fetchARSpawns()` - Get all AR models
  - `fetchARSpawnById(id)` - Get specific AR model
  - `addARSpawn(data)` - Create new AR model
  - `updateARSpawn(id, data)` - Update AR model
  - `deleteARSpawn(id)` - Delete AR model
  - `toggleARSpawnStatus(id, isActive)` - Toggle active status
  - `fetchActiveARSpawnsNearLocation(lat, lng, radius)` - Get nearby spawns

### 2. Pages

- **Path**: `/frontend/src/pages/ar-models/index.tsx`
- **Purpose**: Main listing page for AR models with table view
- **Features**: Search, filter by status, pagination

- **Path**: `/frontend/src/pages/ar-models/add.tsx`
- **Purpose**: Form page for creating/editing AR models
- **Features**: File uploads, map integration, form validation

### 3. Components

- **Path**: `/frontend/src/components/tables/ARModelsTable.tsx`
- **Purpose**: Table component displaying AR models with actions
- **Features**:
  - Display preview images and model details
  - Edit, delete, and toggle status actions
  - Filter by search term and status
  - Pagination

- **Path**: `/frontend/src/components/MapPicker.tsx`
- **Purpose**: Interactive map component using React-Leaflet
- **Features**:
  - Click to set spawn location
  - Display current marker position
  - Auto-center on location changes

### 4. Navigation Updates

- **Path**: `/frontend/src/components/Sidebar.tsx`
- Added "AR Models" navigation item

- **Path**: `/frontend/src/utils/icons.ts`
- Added AR Models icon reference

- **Path**: `/frontend/public/icons/ar-models.svg`
- 3D cube icon for AR Models menu item

## Data Structure

### ARSpawnData Interface

```typescript
{
  id?: string;
  title: string;                    // Model name (e.g., "Nervous Monster")
  description: string;              // Model description
  assetPath: string;                // Firebase Storage URL for 3D model
  preview: string;                  // Firebase Storage URL for preview image
  latitude: number;                 // Spawn latitude coordinate
  longitude: number;                // Spawn longitude coordinate
  catchRadius: number;              // Distance to catch (meters)
  revealRadius: number;             // Distance to reveal (meters)
  catchable_time: number;           // Time limit to catch (seconds)
  coin_value: number;               // Coins reward
  point: number;                    // Points reward
  isActive: boolean;                // Whether visible to users
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

## Dependencies Added

The following packages were installed:

```bash
pnpm add leaflet react-leaflet @types/leaflet
```

- **leaflet**: ^1.9.4 - Interactive map library
- **react-leaflet**: ^5.0.0 - React components for Leaflet
- **@types/leaflet**: ^1.9.21 - TypeScript definitions

## Firebase Storage Structure

Files are stored in Firebase Storage with the following structure:

```
3d_models/
  ar/
    monsters/
      {modelId}.{usdz|glb|gltf}           # 3D model files
      preview_photo/
        {modelId}.jpg                      # Preview images
```

## Usage Guide

### Creating a New AR Model

1. Navigate to "AR Models" in the sidebar
2. Click "Add New Model" button
3. Fill in the form:
   - **Title**: Name of the monster/model
   - **Description**: Detailed description
   - **Active Status**: Enable to make visible to users
   - **Preview Image**: Upload a preview image (JPG/PNG, recommended 512x512px)
   - **3D Model File**: Upload 3D model (USDZ, GLB, or GLTF format)
   - **Location**: Click on the map to set spawn coordinates
   - **Game Parameters**:
     - Catch Radius: Distance users must be within to catch (meters)
     - Reveal Radius: Distance at which model becomes visible (meters)
     - Catchable Time: Time limit to catch the monster (seconds)
     - Points Reward: Points earned when caught
     - Coin Value: Coins earned when caught
4. Click "Create Model"

### Editing an AR Model

1. In the AR Models table, click the Edit (pencil) icon
2. Modify desired fields
3. Upload new files if needed (optional in edit mode)
4. Click "Update Model"

### Managing AR Models

- **Toggle Active/Inactive**: Click the status icon to enable/disable
- **Delete**: Click the trash icon and confirm deletion
- **Search**: Use the search box to filter by title or description
- **Filter by Status**: Use the status dropdown to show only active/inactive models

## Map Integration

The map component uses OpenStreetMap tiles and allows:

- Click anywhere on the map to set spawn location
- Coordinates automatically update in the form
- Manual coordinate entry also updates the map marker
- Default location: Assumption University (13.6135451, 100.8430599)
- Zoom level: 16 (street level)

## File Upload Handling

The system handles file uploads with the following features:

- **Preview Images**: Displayed in the form before upload
- **Validation**: File type checking for models and images
- **Storage Path**: Unique IDs generated for each model
- **Error Handling**: User-friendly error messages
- **Edit Mode**: Files optional when editing (keeps existing if not replaced)

## Security Considerations

1. **Authentication**: All pages protected with `withAdminAuth` HOC
2. **File Validation**: Client-side validation for file types
3. **Storage Rules**: Ensure Firebase Storage rules allow admin uploads
4. **Firestore Rules**: Ensure write access for authenticated admins

## Icon Note

The AR Models icon is currently an SVG file. If you need a PNG version to match other icons, you can:

1. Convert the SVG to PNG using an online tool or image editor
2. Replace `/frontend/public/icons/ar-models.svg` with `ar-models.png`
3. Update `/frontend/src/utils/icons.ts` to reference `.png` instead of `.svg`

## Troubleshooting

### Map Not Displaying

- Ensure `leaflet` CSS is imported in MapPicker.tsx
- Check browser console for any CDN issues with marker icons
- Verify the component is loaded client-side (using `dynamic` with `ssr: false`)

### File Upload Errors

- Check Firebase Storage CORS configuration
- Verify Storage rules allow write access for admins
- Ensure Storage bucket is properly configured in Firebase config

### Firestore Errors

- Verify `ar_spawns` collection has proper indexes if querying with complex filters
- Check Firestore security rules allow read/write for authenticated users

## Future Enhancements

Potential improvements for the AR Models system:

1. Bulk upload for multiple models
2. Model preview/viewer in the admin panel
3. Heat map visualization of spawn locations
4. Analytics for catch rates and user engagement
5. Geofencing and region-based spawns
6. Scheduled spawns (time-based availability)
7. Rarity tiers and spawn probability
8. Integration with game events

## Testing Checklist

- [ ] Create new AR model with all fields
- [ ] Upload 3D model and preview image
- [ ] Set location using map
- [ ] Edit existing AR model
- [ ] Toggle active/inactive status
- [ ] Delete AR model
- [ ] Search and filter functionality
- [ ] Pagination works correctly
- [ ] File uploads to Firebase Storage
- [ ] Metadata saved to Firestore
- [ ] Map displays correctly on different screen sizes
- [ ] Form validation works
- [ ] Loading states display properly
- [ ] Error messages are user-friendly

## Support

For issues or questions, refer to:

- Firebase documentation: https://firebase.google.com/docs
- Leaflet documentation: https://leafletjs.com/reference.html
- React-Leaflet documentation: https://react-leaflet.js.org/
