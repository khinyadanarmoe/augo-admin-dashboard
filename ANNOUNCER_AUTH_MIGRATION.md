# 🔐 Announcer Authentication Migration Guide

## 🎯 What Changed

Your announcer authentication has been upgraded from a **Firestore-based system** to an **enterprise-level Firebase Auth system with custom claims**.

### ❌ Before (Insecure)

- Passwords stored in Firestore
- Authentication checked by document existence
- UIDs didn't match between Auth and Firestore
- Security risk: passwords exposed in database

### ✅ After (Enterprise-Level)

- Passwords managed by Firebase Auth (never stored in Firestore)
- Authentication via custom claims in ID token
- UID consistency: Auth UID = Firestore doc ID
- Fast & secure: claims embedded in token

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN CREATES ANNOUNCER                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
         ┌─────────────────────────────────┐
         │  Admin Panel (Frontend)          │
         │  calls Cloud Function            │
         └──────────────┬──────────────────┘
                        │
                        ▼
         ┌─────────────────────────────────┐
         │  Cloud Function: createAnnouncer │
         │                                  │
         │  1. Create Firebase Auth user    │
         │  2. Set custom claim:            │
         │     { announcer: true }          │
         │  3. Create Firestore doc         │
         │     at /announcers/{uid}         │
         └──────────────┬──────────────────┘
                        │
                        ▼
         ┌─────────────────────────────────┐
         │   Announcer can now login       │
         │   via Firebase Auth             │
         └──────────────┬──────────────────┘
                        │
                        ▼
         ┌─────────────────────────────────┐
         │  Firestore Rules check:         │
         │  request.auth.token.announcer   │
         │  == true                        │
         └─────────────────────────────────┘
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Cloud Functions

```bash
cd /Users/khinyadanarmoe/Desktop/senior_project/AUGo_Admin/functions

# Install dependencies if needed
npm install firebase-functions firebase-admin

# Deploy the new announcer functions
firebase deploy --only functions:createAnnouncer,functions:updateAnnouncer,functions:deleteAnnouncer,functions:setAnnouncerClaim
```

### Step 2: Deploy Firestore Rules

```bash
cd /Users/khinyadanarmoe/Desktop/senior_project/AUGo_Admin

firebase deploy --only firestore:rules
```

### Step 3: Deploy Frontend

```bash
cd /Users/khinyadanarmoe/Desktop/senior_project/AUGo_Admin/frontend

# Install dependencies if needed
npm install firebase

# Build and deploy
npm run build
# Deploy to your hosting (Vercel, Firebase Hosting, etc.)
```

---

## 🔄 Migrating Existing Announcers

If you have **existing announcers** in your system that were created with the old method, you need to migrate them.

### Option A: Migrate Existing Announcer (Manual)

For each existing announcer:

1. **Create Firebase Auth account** (if they don't have one):

   ```bash
   # In Firebase Console → Authentication → Add user
   # Email: announcer@example.com
   # Password: (set temporary password)
   # Copy the UID
   ```

2. **Set custom claim**:

   ```bash
   node scripts/setAnnouncer.js <their-firebase-uid>
   ```

3. **Update Firestore document ID**:
   - In Firebase Console → Firestore → announcers collection
   - Change document ID to match their Firebase Auth UID
   - Delete the `password` field from the document

### Option B: Automated Migration Script

Create a migration script:

```javascript
// scripts/migrateAnnouncers.js
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function migrateAnnouncers() {
  const db = admin.firestore();
  const auth = admin.auth();

  // Get all announcers from Firestore
  const announcersSnapshot = await db.collection("announcers").get();

  for (const doc of announcersSnapshot.docs) {
    const announcer = doc.data();
    const oldDocId = doc.id;

    try {
      console.log(`\nMigrating: ${announcer.email}`);

      // 1. Create Auth user (or get if exists)
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(announcer.email);
        console.log(`✓ Auth user exists: ${userRecord.uid}`);
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          // Create new Auth user with temporary password
          userRecord = await auth.createUser({
            email: announcer.email,
            password: Math.random().toString(36).slice(-12), // Random temp password
            displayName: announcer.name,
          });
          console.log(`✓ Created Auth user: ${userRecord.uid}`);
        } else {
          throw error;
        }
      }

      const uid = userRecord.uid;

      // 2. Set custom claim
      await auth.setCustomUserClaims(uid, { announcer: true });
      console.log(`✓ Set custom claim for: ${uid}`);

      // 3. Create new Firestore doc with Auth UID
      const newAnnouncerData = {
        name: announcer.name,
        email: announcer.email,
        affiliation_name: announcer.affiliation_name,
        affiliation_type: announcer.affiliation_type,
        phone: announcer.phone || "",
        role: announcer.role || "",
        status: announcer.status || "active",
        total_announcements: announcer.total_announcements || 0,
        joined_date:
          announcer.joined_date || admin.firestore.FieldValue.serverTimestamp(),
      };

      // Copy profile picture if exists
      if (announcer.profilePicture) {
        newAnnouncerData.profilePicture = announcer.profilePicture;
      }

      // NO PASSWORD FIELD - that's the point!

      await db.collection("announcers").doc(uid).set(newAnnouncerData);
      console.log(`✓ Created new Firestore doc: /announcers/${uid}`);

      // 4. Delete old document (if different)
      if (oldDocId !== uid) {
        await db.collection("announcers").doc(oldDocId).delete();
        console.log(`✓ Deleted old doc: ${oldDocId}`);
      }

      console.log(`✅ Successfully migrated: ${announcer.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${announcer.email}:`, error.message);
    }
  }

  console.log("\n✅ Migration complete!");
  process.exit(0);
}

migrateAnnouncers();
```

Run it:

```bash
node scripts/migrateAnnouncers.js
```

---

## 🧪 Testing

### Test 1: Create New Announcer

1. Login to admin panel
2. Go to Announcers → Add New
3. Fill in details and submit
4. Check Firebase Console:
   - **Authentication** → User should exist
   - **Firestore** → `/announcers/{uid}` should exist (NO password field)
5. Login as that announcer in your iOS app
6. Should be authenticated successfully

### Test 2: Verify Custom Claim

In your iOS app after announcer logs in:

```swift
Auth.auth().currentUser?.getIDTokenResult { result, error in
    if let claims = result?.claims {
        print("Claims:", claims)
        // Should see: announcer = true

        if let isAnnouncer = claims["announcer"] as? Bool, isAnnouncer {
            print("✅ User is verified announcer")
        }
    }
}
```

### Test 3: Firestore Rules

Try to create/read announcements as:

- ✅ Announcer (with claim) → Should work
- ❌ Regular user (no claim) → Should fail
- ✅ Admin → Should work

---

## 📱 Client-Side Implementation (iOS)

### Force Token Refresh After Login

**Important**: After an announcer logs in, their token must be refreshed to include the custom claim.

```swift
// After successful login
Auth.auth().signIn(withEmail: email, password: password) { result, error in
    guard error == nil else {
        print("Login error:", error!)
        return
    }

    // ⭐ Force refresh token to get custom claims
    Auth.auth().currentUser?.getIDTokenForcingRefresh(true) { token, error in
        if let error = error {
            print("Token refresh error:", error)
            return
        }

        // Now check if user is announcer
        Auth.auth().currentUser?.getIDTokenResult { result, error in
            if let claims = result?.claims,
               let isAnnouncer = claims["announcer"] as? Bool,
               isAnnouncer {
                // Navigate to announcer dashboard
                navigateToAnnouncerDashboard()
            } else {
                print("User is not an announcer")
                Auth.auth().signOut()
            }
        }
    }
}
```

### Check Announcer Status

```swift
func checkUserRole(completion: @escaping (UserRole) -> Void) {
    Auth.auth().currentUser?.getIDTokenResult { result, error in
        guard let claims = result?.claims else {
            completion(.regular)
            return
        }

        if let isAdmin = claims["admin"] as? Bool, isAdmin {
            completion(.admin)
        } else if let isAnnouncer = claims["announcer"] as? Bool, isAnnouncer {
            completion(.announcer)
        } else {
            completion(.regular)
        }
    }
}

enum UserRole {
    case admin
    case announcer
    case regular
}
```

---

## 🔐 Firestore Rules Reference

The new rules use custom claims:

```javascript
// Helper function
function isAnnouncer() {
  return request.auth != null &&
         request.auth.token.announcer == true;
}

// Announcements - announcers can CRUD their own
match /announcements/{announcementId} {
  allow read: if resource.data.status == 'approved';
  allow create: if isAnnouncer();
  allow read, update: if isAnnouncer() &&
                        request.auth.uid == resource.data.announcerId;
  allow read, write: if isAdmin();
}

// Announcers - can read/update their own profile
match /announcers/{announcerId} {
  allow read: if resource.data.status == 'active';
  allow read, update: if isAnnouncer() &&
                        request.auth.uid == announcerId;
  allow read, write: if isAdmin();
}
```

---

## 🛠 Available Cloud Functions

### 1. `createAnnouncer`

Creates a new announcer (Auth + claim + Firestore).

**Usage** (called automatically from admin panel):

```javascript
const createAnnouncerFn = httpsCallable(functions, "createAnnouncer");
const result = await createAnnouncerFn({
  email: "announcer@example.com",
  password: "securePassword123",
  name: "John Smith",
  affiliation_name: "Engineering Department",
  affiliation_type: "Department",
  phone: "123-456-7890",
  role: "PR Assistant",
});
```

### 2. `updateAnnouncer`

Updates announcer info (Auth + Firestore).

```javascript
const updateAnnouncerFn = httpsCallable(functions, "updateAnnouncer");
await updateAnnouncerFn({
  announcerId: "user-uid",
  name: "Updated Name",
  email: "newemail@example.com",
  password: "newPassword123", // Optional
  // ... other fields
});
```

### 3. `deleteAnnouncer`

Deletes announcer from Auth and Firestore.

```javascript
const deleteAnnouncerFn = httpsCallable(functions, "deleteAnnouncer");
await deleteAnnouncerFn({ announcerId: "user-uid" });
```

### 4. `setAnnouncerClaim`

Sets custom claim for existing user.

```javascript
const setAnnouncerClaimFn = httpsCallable(functions, "setAnnouncerClaim");
await setAnnouncerClaimFn({ userId: "user-uid" });
```

---

## 🐛 Troubleshooting

### Problem: "Permission denied" when announcer tries to create announcement

**Solution**: Announcer's token doesn't have the custom claim.

1. Check if claim is set:

   ```bash
   # In Firebase Console → Authentication → Click user → Custom claims
   # Should see: { "announcer": true }
   ```

2. Force token refresh on client:
   ```swift
   Auth.auth().currentUser?.getIDTokenForcingRefresh(true)
   ```

### Problem: Announcer can't login

**Causes**:

1. Auth account not created
2. Wrong password
3. Email not verified (if required)

**Solution**:

- Check Firebase Console → Authentication
- Reset password if needed
- Verify custom claim is set

### Problem: "Cloud function not found"

**Solution**:

1. Check functions are deployed:

   ```bash
   firebase deploy --only functions
   ```

2. Check function names match in code:
   ```javascript
   httpsCallable(functions, "createAnnouncer"); // Must match export name
   ```

### Problem: Firestore document ID doesn't match UID

**Solution**: This is a migration issue.

1. Delete the old document
2. Recreate via `createAnnouncer` Cloud Function
3. Or manually change document ID in Firebase Console

---

## ✅ Checklist

Before going to production:

- [ ] Cloud Functions deployed
- [ ] Firestore rules deployed
- [ ] Frontend deployed
- [ ] Existing announcers migrated
- [ ] All old password fields removed from Firestore
- [ ] iOS app updated with token refresh logic
- [ ] Custom claims verified for all announcers
- [ ] End-to-end testing completed
- [ ] Documentation updated for team

---

## 📞 Scripts Reference

### Set Custom Claim Manually

```bash
node scripts/setAnnouncer.js <firebase-uid>
```

### Set Admin Claim

```bash
NEXT_PUBLIC_FIREBASE_ADMIN_UID=<uid> node scripts/setAdmin.js
```

---

## 🎓 Why This Is Better

| Aspect               | Old System                          | New System                   |
| -------------------- | ----------------------------------- | ---------------------------- |
| **Security**         | Passwords in Firestore ❌           | Passwords in Auth ✅         |
| **Speed**            | Document query on every request     | Claim in token (instant)     |
| **Consistency**      | UID mismatch possible               | Auth UID = Doc ID            |
| **Scalability**      | Firestore read for every auth check | Zero extra reads             |
| **Best Practice**    | Custom implementation               | Firebase recommended pattern |
| **Token Management** | Manual                              | Automatic via Firebase       |

---

## 📚 References

- [Firebase Custom Claims Docs](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/best-practices)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**🎉 Your announcer authentication is now enterprise-level secure!**
