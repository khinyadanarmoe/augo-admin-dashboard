import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface CreateAnnouncerRequest {
  email: string;
  password: string;
  name: string;
  affiliation_name: string;
  affiliation_type: string;
  phone: string;
  role: string;
  profilePicture?: string; // Optional - storage path (e.g., "announcers/{id}/profile.jpg")
}

interface UpdateAnnouncerRequest {
  announcerId: string;
  email?: string;
  password?: string;
  name?: string;
  affiliation_name?: string;
  affiliation_type?: string;
  phone?: string;
  role?: string;
  profilePicture?: string; // Optional - storage path (e.g., "announcers/{id}/profile.jpg")
}

/**
 * Creates an announcer with Firebase Auth + custom claims + Firestore document
 * This function can only be called by admin users
 */
export const createAnnouncer = functions.https.onCall(async (data: CreateAnnouncerRequest, context) => {
  try {
    // ✅ STEP 1 — Verify caller is admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create announcers"
      );
    }

    // Check if caller has admin custom claim
    const callerToken = await admin.auth().getUser(context.auth.uid);
    const isAdmin = callerToken.customClaims?.admin === true;

    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can create announcers"
      );
    }

    // ✅ STEP 2 — Validate input
    const { email, password, name, affiliation_name, affiliation_type, phone, role } = data;

    if (!email || !password || !name || !affiliation_name || !affiliation_type) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: email, password, name, affiliation_name, affiliation_type"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid email format"
      );
    }

    // Validate password strength (minimum 6 characters as per Firebase requirement)
    if (password.length < 6) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters long"
      );
    }

    functions.logger.info(`Creating announcer with email: ${email}`);

    // ✅ STEP 3 — Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false, // Set to true if you want to skip email verification
    });

    const uid = userRecord.uid;
    functions.logger.info(`Firebase Auth user created with UID: ${uid}`);

    try {
      // ✅ STEP 4 — Set custom claim { announcer: true }
      await admin.auth().setCustomUserClaims(uid, {
        announcer: true,
      });
      functions.logger.info(`Custom claim 'announcer: true' set for UID: ${uid}`);

      // ✅ STEP 5 — Create Firestore document with UID as document ID
      const announcerData = {
        name,
        email,
        affiliation_name,
        affiliation_type,
        phone: phone || "",
        role: role || "",
        status: "active",
        total_announcements: 0,
        joined_date: admin.firestore.FieldValue.serverTimestamp(),
        ...(data.profilePicture && { profilePicture: data.profilePicture })
      };

      await admin.firestore()
        .collection("announcers")
        .doc(uid) // ⭐ Document ID = Firebase Auth UID
        .set(announcerData);

      functions.logger.info(`Firestore document created for announcer: ${uid}`);

      return {
        success: true,
        uid: uid,
        message: "Announcer created successfully. User must refresh their token on login.",
      };

    } catch (firestoreError) {
      // ❌ Rollback: Delete Auth user if Firestore/claim setting fails
      functions.logger.error(`Failed to create Firestore document or set claims, rolling back Auth user: ${uid}`, firestoreError);
      await admin.auth().deleteUser(uid);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to complete announcer creation. Auth user was rolled back."
      );
    }

  } catch (error: any) {
    functions.logger.error("Error creating announcer:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Handle specific Auth errors
    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError(
        "already-exists",
        "An account with this email already exists"
      );
    }

    if (error.code === "auth/invalid-email") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid email address"
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to create announcer: ${error.message}`
    );
  }
});

/**
 * Updates an announcer's information
 * Can update Firebase Auth and/or Firestore document
 */
export const updateAnnouncer = functions.https.onCall(async (data: UpdateAnnouncerRequest, context) => {
  try {
    // ✅ Verify caller is admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const callerToken = await admin.auth().getUser(context.auth.uid);
    const isAdmin = callerToken.customClaims?.admin === true;

    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can update announcers"
      );
    }

    const { announcerId } = data;

    if (!announcerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "announcerId is required"
      );
    }

    functions.logger.info(`Updating announcer: ${announcerId}`);

    // Update Firebase Auth if email or password is changing
    const authUpdates: any = {};

    if (data.email) {
      authUpdates.email = data.email;
    }

    if (data.password) {
      if (data.password.length < 6) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Password must be at least 6 characters long"
        );
      }
      authUpdates.password = data.password;
    }

    if (data.name) {
      authUpdates.displayName = data.name;
    }

    // Update Auth if there are changes
    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(announcerId, authUpdates);
      functions.logger.info(`Firebase Auth updated for: ${announcerId}`);
    }

    // Update Firestore document
    const firestoreUpdates: any = {};

    if (data.name !== undefined) firestoreUpdates.name = data.name;
    if (data.email !== undefined) firestoreUpdates.email = data.email;
    if (data.affiliation_name !== undefined) firestoreUpdates.affiliation_name = data.affiliation_name;
    if (data.affiliation_type !== undefined) firestoreUpdates.affiliation_type = data.affiliation_type;
    if (data.phone !== undefined) firestoreUpdates.phone = data.phone;
    if (data.role !== undefined) firestoreUpdates.role = data.role;
    if (data.profilePicture !== undefined) firestoreUpdates.profilePicture = data.profilePicture;

    if (Object.keys(firestoreUpdates).length > 0) {
      await admin.firestore()
        .collection("announcers")
        .doc(announcerId)
        .update(firestoreUpdates);

      functions.logger.info(`Firestore document updated for: ${announcerId}`);
    }

    return {
      success: true,
      message: "Announcer updated successfully",
    };

  } catch (error: any) {
    functions.logger.error("Error updating announcer:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to update announcer: ${error.message}`
    );
  }
});

/**
 * Deletes an announcer (both Auth and Firestore)
 */
export const deleteAnnouncer = functions.https.onCall(async (data: { announcerId: string }, context) => {
  try {
    // ✅ Verify caller is admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const callerToken = await admin.auth().getUser(context.auth.uid);
    const isAdmin = callerToken.customClaims?.admin === true;

    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can delete announcers"
      );
    }

    const { announcerId } = data;

    if (!announcerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "announcerId is required"
      );
    }

    functions.logger.info(`Deleting announcer: ${announcerId}`);

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(announcerId);
      functions.logger.info(`Firebase Auth user deleted: ${announcerId}`);
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
      functions.logger.warn(`Auth user not found: ${announcerId}, continuing with Firestore deletion`);
    }

    // Delete from Firestore
    await admin.firestore()
      .collection("announcers")
      .doc(announcerId)
      .delete();

    functions.logger.info(`Firestore document deleted: ${announcerId}`);

    return {
      success: true,
      message: "Announcer deleted successfully",
    };

  } catch (error: any) {
    functions.logger.error("Error deleting announcer:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to delete announcer: ${error.message}`
    );
  }
});

/**
 * Manually set or refresh custom claims for an existing announcer
 * Useful for migration or fixing existing users
 */
export const setAnnouncerClaim = functions.https.onCall(async (data: { userId: string }, context) => {
  try {
    // ✅ Verify caller is admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const callerToken = await admin.auth().getUser(context.auth.uid);
    const isAdmin = callerToken.customClaims?.admin === true;

    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can set custom claims"
      );
    }

    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "userId is required"
      );
    }

    functions.logger.info(`Setting announcer claim for: ${userId}`);

    // Set custom claim
    await admin.auth().setCustomUserClaims(userId, {
      announcer: true,
    });

    functions.logger.info(`Custom claim set for: ${userId}`);

    return {
      success: true,
      message: "Announcer claim set successfully. User must refresh their token.",
    };

  } catch (error: any) {
    functions.logger.error("Error setting announcer claim:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    if (error.code === "auth/user-not-found") {
      throw new functions.https.HttpsError(
        "not-found",
        "User not found"
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      `Failed to set announcer claim: ${error.message}`
    );
  }
});
