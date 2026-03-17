import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Scheduled function that runs every 5 minutes to activate announcements
 * whose scheduled start time has arrived
 */
export const activateScheduledAnnouncements = functions.pubsub
    .schedule("every 5 minutes")
    .timeZone("Asia/Bangkok") // Adjust to your timezone if needed
    .onRun(async (context) => {
        try {
            const now = admin.firestore.Timestamp.now();

            functions.logger.info("Checking for scheduled announcements to activate", {
                currentTime: now.toDate().toISOString(),
            });

            // Query announcements that are scheduled and should now be active
            const scheduledQuery = await admin
                .firestore()
                .collection("announcements")
                .where("status", "==", "scheduled")
                .where("startDate", "<=", now)
                .get();

            if (scheduledQuery.empty) {
                functions.logger.info("No scheduled announcements to activate");
                return null;
            }

            functions.logger.info(`Found ${scheduledQuery.size} announcements to activate`);

            // Batch update the announcements to active status
            const batch = admin.firestore().batch();
            const activatedAnnouncements: string[] = [];

            scheduledQuery.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    status: "active",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                activatedAnnouncements.push(doc.id);
            });

            await batch.commit();

            functions.logger.info("Successfully activated scheduled announcements", {
                count: scheduledQuery.size,
                announcementIds: activatedAnnouncements,
            });

            return {
                success: true,
                activatedCount: scheduledQuery.size,
                announcementIds: activatedAnnouncements,
            };
        } catch (error) {
            functions.logger.error("Error activating scheduled announcements", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    });

/**
 * Scheduled function that runs every hour to expire announcements
 * whose end date has passed
 */
export const expireEndedAnnouncements = functions.pubsub
    .schedule("every 1 hours")
    .timeZone("Asia/Bangkok") // Adjust to your timezone if needed
    .onRun(async (context) => {
        try {
            const now = admin.firestore.Timestamp.now();

            functions.logger.info("Checking for active announcements to expire", {
                currentTime: now.toDate().toISOString(),
            });

            // Query active announcements whose end date has passed
            const activeQuery = await admin
                .firestore()
                .collection("announcements")
                .where("status", "==", "active")
                .where("endDate", "<=", now)
                .get();

            if (activeQuery.empty) {
                functions.logger.info("No active announcements to expire");
                return null;
            }

            functions.logger.info(`Found ${activeQuery.size} announcements to expire`);

            // Batch update the announcements to expired status
            const batch = admin.firestore().batch();
            const expiredAnnouncements: string[] = [];

            activeQuery.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    status: "expired",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                expiredAnnouncements.push(doc.id);
            });

            await batch.commit();

            functions.logger.info("Successfully expired announcements", {
                count: activeQuery.size,
                announcementIds: expiredAnnouncements,
            });

            return {
                success: true,
                expiredCount: activeQuery.size,
                announcementIds: expiredAnnouncements,
            };
        } catch (error) {
            functions.logger.error("Error expiring announcements", {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    });

/**
 * Creates an announcement and verifies the announcer is active
 * Prevents inactive announcers from creating announcements
 */
export const createAnnouncement = functions.https.onCall(async (data: any, context) => {
    try {
        // ✅ Verify caller is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "User must be authenticated to create an announcement"
            );
        }

        const announcerId = context.auth.uid;

        functions.logger.info(`Creating announcement for announcer: ${announcerId}`);

        // ✅ Check if announcer exists and is active
        const announcerDoc = await admin.firestore()
            .collection("announcers")
            .doc(announcerId)
            .get();

        if (!announcerDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Announcer profile not found"
            );
        }

        const announcerData = announcerDoc.data();

        if (!announcerData) {
            throw new functions.https.HttpsError(
                "not-found",
                "Announcer data is missing"
            );
        }

        // Check if announcer status is active
        if (announcerData.status !== "active") {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Your announcer account has been deactivated. You cannot create new announcements. Please contact an administrator."
            );
        }

        functions.logger.info(`Announcer ${announcerId} is active, creating announcement`);

        // ✅ Create the announcement
        const announcementData = {
            ...data,
            createdByUID: announcerId,
            createdByName: announcerData.name || "Unknown",
            createdByEmail: announcerData.email || "unknown@example.com",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await admin.firestore()
            .collection("announcements")
            .add(announcementData);

        functions.logger.info(`Announcement created successfully: ${docRef.id}`);

        return {
            success: true,
            announcementId: docRef.id,
            message: "Announcement created successfully"
        };

    } catch (error: any) {
        functions.logger.error("Error creating announcement:", error);

        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        throw new functions.https.HttpsError(
            "internal",
            `Failed to create announcement: ${error.message}`
        );
    }
});
