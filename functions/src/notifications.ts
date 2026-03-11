import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

interface UserNotification {
  adminId: string;
  createdAt: admin.firestore.Timestamp;
  isRead: boolean;
  message: string;
  relatedPostId?: string;
  title: string;
  type: "warning" | "ban" | "info" | "announcement";
  userId: string;
}

interface UserProfile {
  fcmToken?: string;
  name: string;
  email: string;
  // Add other user fields as needed
}

interface AnnouncementNotification {
  adminId: string;
  announcementId: string;
  announcementTitle: string;
  action: "approved" | "declined";
  createdAt: admin.firestore.Timestamp;
  isRead: boolean;
  message: string;
  title: string;
  userId: string;
}

/**
 * Sends push notification when a new user notification is created
 */
export const sendUserNotification = functions.firestore
  .document("user_notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data() as UserNotification;
      const notificationId = context.params.notificationId;

      functions.logger.info(
        `Processing notification: ${notificationId} for user: ${notification.userId}`,
        { notificationId, userId: notification.userId, type: notification.type }
      );

      // Get user's FCM token from users collection
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(notification.userId)
        .get();

      if (!userDoc.exists) {
        functions.logger.warn(
          `User not found: ${notification.userId}`,
          { userId: notification.userId, notificationId }
        );
        return;
      }

      const userData = userDoc.data() as UserProfile;
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        functions.logger.warn(
          `No FCM token for user: ${notification.userId}`,
          { userId: notification.userId, notificationId }
        );
        return;
      }

      // Prepare notification payload
      const pushNotification = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: getTruncatedMessage(notification.message),
        },
        data: {
          notificationId: notificationId,
          type: notification.type,
          userId: notification.userId,
          relatedPostId: notification.relatedPostId || "",
          createdAt: notification.createdAt.toMillis().toString(),
        },
        android: {
          notification: {
            priority: "high" as const,
            defaultSound: true,
            channelId: getChannelId(notification.type),
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: getTruncatedMessage(notification.message),
              },
              badge: await getUnreadNotificationCount(notification.userId),
              sound: getSoundForType(notification.type),
              category: notification.type.toUpperCase(),
            },
          },
        },
      };

      // Send the notification
      const response = await admin.messaging().send(pushNotification);
      functions.logger.info(
        `Successfully sent notification: ${notificationId}`,
        {
          notificationId,
          userId: notification.userId,
          messageId: response,
          type: notification.type,
        }
      );

      // Log the notification send event for analytics
      await admin.firestore()
        .collection("notification_logs")
        .add({
          notificationId: notificationId,
          userId: notification.userId,
          type: notification.type,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          success: true,
          messageId: response,
          fcmToken: fcmToken.substring(0, 10) + "...", // Partial token for privacy
        });
    } catch (error) {
      functions.logger.error(
        "Failed to send notification",
        {
          notificationId: context.params.notificationId,
          error: error,
          userId: snap.data().userId,
        }
      );

      // Log the failed notification attempt
      await admin.firestore()
        .collection("notification_logs")
        .add({
          notificationId: context.params.notificationId,
          userId: snap.data().userId,
          type: snap.data().type,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

      // If token is invalid, we might want to remove it
      if (error instanceof Error &&
        (error.message.includes("invalid-registration-token") ||
          error.message.includes("registration-token-not-registered"))) {
        functions.logger.info(
          `Removing invalid FCM token for user: ${snap.data().userId}`
        );

        await admin.firestore()
          .collection("users")
          .doc(snap.data().userId)
          .update({
            fcmToken: admin.firestore.FieldValue.delete(),
          });
      }
    }
  });

/**
 * Get truncated message for notification display
 */
function getTruncatedMessage(message: string): string {
  const maxLength = 200; // Increased from 100 to 200 for announcement notifications
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength - 3) + "...";
}

/**
 * Get notification channel ID for Android
 */
function getChannelId(type: string): string {
  switch (type) {
    case "warning":
      return "warnings";
    case "ban":
      return "moderation";
    case "announcement":
      return "announcements";
    default:
      return "general";
  }
}

/**
 * Get sound file for iOS notification type
 */
function getSoundForType(type: string): string {
  switch (type) {
    case "warning":
    case "ban":
      return "alert.caf";
    case "announcement":
      return "announcement.caf";
    default:
      return "default";
  }
}

/**
 * Get unread notification count for badge (iOS)
 */
async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const unreadSnapshot = await admin.firestore()
      .collection("user_notifications")
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .count()
      .get();

    return unreadSnapshot.data().count;
  } catch (error) {
    functions.logger.warn("Failed to get unread count", { userId, error });
    return 0;
  }
}

/**
 * Get unread announcement notification count for badge (iOS)
 */
async function getUnreadAnnouncementNotificationCount(
  userId: string
): Promise<number> {
  try {
    const unreadSnapshot = await admin.firestore()
      .collection("announcement_notifications")
      .where("userId", "==", userId)
      .where("isRead", "==", false)
      .count()
      .get();

    return unreadSnapshot.data().count;
  } catch (error) {
    functions.logger.warn("Failed to get unread count", { userId, error });
    return 0;
  }
}

/**
 * Sends push notification when a new announcement notification is created
 * This is for announcer users (iOS app) who get notified about their announcement status
 */
export const sendAnnouncementNotification = functions.firestore
  .document("announcement_notifications/{notificationId}")
  .onCreate(async (snap, context) => {
    try {
      const notification = snap.data() as AnnouncementNotification;
      const notificationId = context.params.notificationId;

      functions.logger.info(
        `Processing announcement notification: ${notificationId} for user: ${notification.userId}`,
        {
          notificationId,
          userId: notification.userId,
          action: notification.action,
          announcementId: notification.announcementId,
        }
      );

      // Get announcer's FCM token from announcers collection
      const announcerDoc = await admin.firestore()
        .collection("announcers")
        .doc(notification.userId)
        .get();

      if (!announcerDoc.exists) {
        functions.logger.warn(
          `Announcer not found: ${notification.userId}`,
          { userId: notification.userId, notificationId }
        );
        return;
      }

      const announcerData = announcerDoc.data();
      const fcmToken = announcerData?.fcmToken;

      if (!fcmToken) {
        functions.logger.warn(
          `No FCM token for announcer: ${notification.userId}`,
          { userId: notification.userId, notificationId }
        );
        return;
      }

      // Prepare notification payload
      const pushNotification = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: getTruncatedMessage(notification.message),
        },
        data: {
          notificationId: notificationId,
          type: "announcement_status",
          action: notification.action,
          userId: notification.userId,
          announcementId: notification.announcementId,
          announcementTitle: notification.announcementTitle,
          createdAt: notification.createdAt.toMillis().toString(),
        },
        android: {
          notification: {
            priority: "high" as const,
            defaultSound: true,
            channelId: "announcements",
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: getTruncatedMessage(notification.message),
              },
              badge: await getUnreadAnnouncementNotificationCount(
                notification.userId
              ),
              sound: notification.action === "approved" ?
                "announcement.caf" : "default",
              category: "ANNOUNCEMENT_STATUS",
            },
          },
        },
      };

      // Send the notification
      const response = await admin.messaging().send(pushNotification);
      functions.logger.info(
        `Successfully sent announcement notification: ${notificationId}`,
        {
          notificationId,
          userId: notification.userId,
          messageId: response,
          action: notification.action,
          announcementId: notification.announcementId,
        }
      );

      // Log the notification send event for analytics
      await admin.firestore()
        .collection("notification_logs")
        .add({
          notificationId: notificationId,
          userId: notification.userId,
          type: "announcement_status",
          action: notification.action,
          announcementId: notification.announcementId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          success: true,
          messageId: response,
          fcmToken: fcmToken.substring(0, 10) + "...", // Partial token for privacy
        });
    } catch (error) {
      functions.logger.error(
        "Failed to send announcement notification",
        {
          notificationId: context.params.notificationId,
          error: error,
          userId: snap.data().userId,
        }
      );

      // Log the failed notification attempt
      await admin.firestore()
        .collection("notification_logs")
        .add({
          notificationId: context.params.notificationId,
          userId: snap.data().userId,
          type: "announcement_status",
          action: snap.data().action,
          announcementId: snap.data().announcementId,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

      // If token is invalid, remove it
      if (error instanceof Error &&
        (error.message.includes("invalid-registration-token") ||
          error.message.includes("registration-token-not-registered"))) {
        functions.logger.info(
          `Removing invalid FCM token for announcer: ${snap.data().userId}`
        );

        await admin.firestore()
          .collection("users")
          .doc(snap.data().userId)
          .update({
            fcmToken: admin.firestore.FieldValue.delete(),
          });
      }
    }
  });