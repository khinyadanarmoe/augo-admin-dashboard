import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

import {sendUserNotification} from "./notifications";

// Export all functions
export {sendUserNotification};