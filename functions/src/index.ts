import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

import {sendUserNotification} from "./notifications";
import {
  createAnnouncer,
  updateAnnouncer,
  deleteAnnouncer,
  setAnnouncerClaim,
} from "./announcers";

// Export all functions
export {sendUserNotification};

// Export announcer management functions
export {createAnnouncer, updateAnnouncer, deleteAnnouncer, setAnnouncerClaim};