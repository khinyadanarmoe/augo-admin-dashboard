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
