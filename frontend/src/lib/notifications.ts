import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface NotificationData {
  userId: string;
  adminId: string;
  type: 'warning' | 'ban' | 'info' | 'announcement';
  title: string;
  message: string;
  relatedPostId?: string;
}

/**
 * Creates a user notification in Firestore
 * This will automatically trigger the Cloud Function to send push notification
 */
export const createUserNotification = async (notificationData: NotificationData): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'user_notifications'), {
      ...notificationData,
      createdAt: serverTimestamp(),
      isRead: false,
    });

    console.log('Notification created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send warning notification for community guideline violation
 */
export const sendCommunityWarning = async (
  userId: string,
  adminId: string,
  relatedPostId: string,
  customMessage?: string
): Promise<string> => {
  const defaultMessage = "A post you shared was reviewed by our admin team after being reported. We encourage you to review our community guidelines to help keep the community positive and respectful. Repeated violations may lead to temporary restrictions or permanent ban.";
  
  return createUserNotification({
    userId,
    adminId,
    type: 'warning',
    title: 'Community Guidelines Warning',
    message: customMessage || defaultMessage,
    relatedPostId,
  });
};

/**
 * Send temporary ban notification
 */
export const sendTemporaryBan = async (
  userId: string,
  adminId: string,
  banDuration: string, // e.g., "3 days", "1 week"
  reason: string,
  relatedPostId?: string
): Promise<string> => {
  const message = `Your account has been temporarily restricted for ${banDuration} due to: ${reason}. You will not be able to post during this period. Please review our community guidelines to avoid future restrictions.`;
  
  return createUserNotification({
    userId,
    adminId,
    type: 'ban',
    title: `Temporary Account Restriction - ${banDuration}`,
    message,
    relatedPostId,
  });
};

/**
 * Send permanent ban notification
 */
export const sendPermanentBan = async (
  userId: string,
  adminId: string,
  reason: string,
  relatedPostId?: string
): Promise<string> => {
  const message = `Your account has been permanently banned due to repeated violations of our community guidelines. Reason: ${reason}. This decision is final and your access to the platform has been revoked.`;
  
  return createUserNotification({
    userId,
    adminId,
    type: 'ban',
    title: 'Account Permanently Banned',
    message,
    relatedPostId,
  });
};

/**
 * Send general announcement to user
 */
export const sendAnnouncementToUser = async (
  userId: string,
  adminId: string,
  title: string,
  message: string
): Promise<string> => {
  return createUserNotification({
    userId,
    adminId,
    type: 'announcement',
    title,
    message,
  });
};