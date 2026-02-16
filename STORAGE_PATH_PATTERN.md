# 📦 Storage Path vs URL Pattern

## ✅ What Changed

**Before:** Storing full Firebase Storage URLs in Firestore  
**After:** Storing only storage paths in Firestore

---

## 🎯 Why This Matters

### ❌ Before (URLs in Firestore)

```javascript
{
  id: "abc123",
  name: "John Smith",
  profilePicture: "https://firebasestorage.googleapis.com/v0/b/augo-469c5.appspot.com/o/announcers%2Fabc123%2Fprofile.jpg?alt=media&token=..."
}
```

**Problems:**

- ❌ Very long strings (waste of storage)
- ❌ Contains tokens that can expire
- ❌ Hard to migrate between Firebase projects
- ❌ Not following Firebase best practices

### ✅ After (Paths in Firestore)

```javascript
{
  id: "abc123",
  name: "John Smith",
  profilePicture: "announcers/abc123/profile.jpg"
}
```

**Benefits:**

- ✅ Short and clean
- ✅ Stable (doesn't change)
- ✅ Easy to migrate
- ✅ Follows Firebase best practices
- ✅ Generate URL only when needed

---

## 📁 Storage Path Pattern

### Announcers

```
announcers/{announcerId}/profile.jpg
```

Example:

```
announcers/abc123xyz/profile.jpg
```

### AR Models

```
3d_models/ar/{category}/{modelId}.{extension}
```

Examples:

```
3d_models/ar/monsters/sleepymonster.usdz
3d_models/ar/monsters/preview_photo/sleepymonster.jpg
```

---

## 🔧 Updated Files

### Frontend

- ✅ `frontend/src/pages/announcers/add.tsx` - Returns path instead of URL
- ✅ `frontend/src/pages/ar-models/add.tsx` - Returns path instead of URL
- ✅ `frontend/src/lib/firestore/announcers.ts` - Updated comments
- ✅ `frontend/src/lib/storageUtils.ts` - **NEW** - Utilities to convert paths to URLs

### Backend

- ✅ `functions/src/announcers.ts` - Updated interface comments

---

## 🚀 How to Use

### Saving to Firestore (Already Implemented)

When uploading files, save only the path:

```typescript
// ✅ Correct - Save path
const storagePath = `announcers/${userId}/profile.jpg`;
const storageRef = ref(storage, storagePath);
await uploadBytes(storageRef, file);

// Save path to Firestore
await updateDoc(userRef, {
  profilePicture: storagePath, // Just the path!
});
```

### Displaying Images (Use Utility)

When you need to display an image, convert path to URL:

#### Option 1: Using the Hook (Recommended)

```typescript
import { useStorageUrl } from "@/lib/storageUtils";

function AnnouncerAvatar({ announcer }) {
  const { url, loading, error } = useStorageUrl(announcer.profilePicture);

  if (loading) return <LoadingSpinner />;
  if (error || !url) return <DefaultAvatar />;

  return <img src={url} alt={announcer.name} />;
}
```

#### Option 2: Using the Function

```typescript
import { getStorageUrl } from "@/lib/storageUtils";

async function loadImage() {
  const path = "announcers/abc123/profile.jpg";
  const url = await getStorageUrl(path);

  if (url) {
    setImageUrl(url);
  }
}
```

#### Option 3: Multiple URLs at Once

```typescript
import { getStorageUrls } from "@/lib/storageUtils";

async function loadMultipleImages() {
  const paths = [
    "announcers/abc123/profile.jpg",
    "announcers/def456/profile.jpg",
    "3d_models/ar/monsters/sleepy.usdz",
  ];

  const urls = await getStorageUrls(paths);
  // urls is an array of URLs (or null for failed conversions)
}
```

---

## 📊 Example: Announcer Table

If you need to display announcer profile pictures in a table:

```typescript
import { useStorageUrl } from "@/lib/storageUtils";

function AnnouncerRow({ announcer }) {
  const { url, loading } = useStorageUrl(announcer.profilePicture);

  return (
    <tr>
      <td>
        {loading ? (
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        ) : url ? (
          <img src={url} className="w-10 h-10 rounded-full" alt={announcer.name} />
        ) : (
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span>{announcer.name[0]}</span>
          </div>
        )}
      </td>
      <td>{announcer.name}</td>
      <td>{announcer.email}</td>
    </tr>
  );
}
```

---

## 🔍 Checking Your Data

### Correct Format ✅

In Firebase Console → Firestore → announcers collection:

```json
{
  "id": "abc123",
  "name": "John Smith",
  "email": "john@example.com",
  "profilePicture": "announcers/abc123/profile.jpg"
}
```

### Incorrect Format ❌

```json
{
  "id": "abc123",
  "name": "John Smith",
  "email": "john@example.com",
  "profilePicture": "https://firebasestorage.googleapis.com/v0/b/augo-469c5.appspot.com/o/announcers%2Fabc123%2Fprofile.jpg?alt=media&token=..."
}
```

---

## 🔄 Migrating Existing Data

If you have existing documents with URLs instead of paths, run this migration:

```javascript
// scripts/migrateStoragePaths.js
const admin = require("firebase-admin");
admin.initializeApp();

async function migrateStoragePaths() {
  const db = admin.firestore();

  // Migrate announcers
  const announcers = await db.collection("announcers").get();

  for (const doc of announcers.docs) {
    const data = doc.data();

    if (data.profilePicture && data.profilePicture.startsWith("https://")) {
      // Extract path from URL
      // https://...../o/announcers%2Fabc123%2Fprofile.jpg?alt=...
      // -> announcers/abc123/profile.jpg

      const match = data.profilePicture.match(/\/o\/(.+?)\?/);
      if (match) {
        const encodedPath = match[1];
        const path = decodeURIComponent(encodedPath);

        await doc.ref.update({
          profilePicture: path,
        });

        console.log(`✅ Updated ${doc.id}: ${path}`);
      }
    }
  }

  console.log("✅ Migration complete!");
}

migrateStoragePaths();
```

Run it:

```bash
node scripts/migrateStoragePaths.js
```

---

## 🧪 Testing

### Test 1: Create New Announcer

1. Create a new announcer via admin panel
2. Check Firestore:
   ```
   profilePicture: "announcers/{uid}/profile.jpg" ✅
   ```
   NOT:
   ```
   profilePicture: "https://..." ❌
   ```

### Test 2: Display Profile Picture

Add this to your announcer detail component:

```typescript
const { url } = useStorageUrl(announcer.profilePicture);
console.log("Storage path:", announcer.profilePicture);
console.log("Download URL:", url);
```

Should see:

```
Storage path: announcers/abc123/profile.jpg
Download URL: https://firebasestorage.googleapis.com/...
```

---

## 📚 Utility Reference

### `getStorageUrl(path)`

Converts a single path to URL.

**Parameters:**

- `path` (string | undefined | null) - Storage path

**Returns:**

- `Promise<string | null>` - Download URL or null

**Example:**

```typescript
const url = await getStorageUrl("announcers/abc123/profile.jpg");
```

---

### `getStorageUrls(paths)`

Converts multiple paths to URLs.

**Parameters:**

- `paths` (Array<string | undefined | null>) - Array of storage paths

**Returns:**

- `Promise<Array<string | null>>` - Array of download URLs

**Example:**

```typescript
const urls = await getStorageUrls([
  "announcers/abc/profile.jpg",
  "3d_models/ar/sleepy.usdz",
]);
```

---

### `useStorageUrl(path)`

React hook for converting path to URL.

**Parameters:**

- `path` (string | undefined | null) - Storage path

**Returns:**

- Object with:
  - `url` (string | null) - Download URL
  - `loading` (boolean) - Loading state
  - `error` (Error | null) - Error if failed

**Example:**

```typescript
const { url, loading, error } = useStorageUrl(announcer.profilePicture);

if (loading) return <Spinner />;
if (error) return <ErrorMessage />;
return <img src={url} />;
```

---

## ✅ Benefits Summary

| Aspect            | URLs in Firestore      | Paths in Firestore |
| ----------------- | ---------------------- | ------------------ |
| **Size**          | ~200+ characters       | ~30-50 characters  |
| **Stability**     | Can change with tokens | Never changes      |
| **Portability**   | Tied to project        | Easy to migrate    |
| **Best Practice** | ❌ Not recommended     | ✅ Recommended     |
| **Storage Cost**  | Higher                 | Lower              |
| **Query Speed**   | Same                   | Same               |
| **Display Speed** | Instant                | +1 async call      |

The small trade-off of one async call when displaying is worth the massive benefits in data cleanliness and portability.

---

**✅ Your storage is now following Firebase best practices!**
