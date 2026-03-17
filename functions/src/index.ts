import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

import { sendUserNotification, sendAnnouncementNotification } from "./notifications";
import {
  createAnnouncer,
  updateAnnouncer,
  deleteAnnouncer,
  setAnnouncerClaim,
  updateAnnouncerStatus,
} from "./announcers";
import {
  activateScheduledAnnouncements,
  expireEndedAnnouncements,
  createAnnouncement,
} from "./announcements";
import {
  handleNewReport,
  updateReportMetrics,
} from "./reports";

// Export all functions
export { sendUserNotification, sendAnnouncementNotification };

// Export announcer management functions
export { createAnnouncer, updateAnnouncer, deleteAnnouncer, setAnnouncerClaim, updateAnnouncerStatus };

// Export announcement scheduled functions
export { activateScheduledAnnouncements, expireEndedAnnouncements, createAnnouncement };

// Export report management functions
export { handleNewReport, updateReportMetrics };