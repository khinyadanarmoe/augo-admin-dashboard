import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

import { sendUserNotification } from "./notifications";
import {
  createAnnouncer,
  updateAnnouncer,
  deleteAnnouncer,
  setAnnouncerClaim,
} from "./announcers";
import {
  activateScheduledAnnouncements,
  expireEndedAnnouncements,
} from "./announcements";
import {
  handleNewReport,
  updateReportMetrics,
} from "./reports";

// Export all functions
export { sendUserNotification };

// Export announcer management functions
export { createAnnouncer, updateAnnouncer, deleteAnnouncer, setAnnouncerClaim };

// Export announcement scheduled functions
export { activateScheduledAnnouncements, expireEndedAnnouncements };

// Export report management functions
export { handleNewReport, updateReportMetrics };