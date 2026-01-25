import { 
  collection, 
  addDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserNotification {
  id: string;
  userId: string;
  type: 'warning' | 'info' | 'ban' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedPostId?: string;
  adminId?: string;
}

const USER_NOTIFICATIONS_COLLECTION = 'user_notifications';

/**
 * Send a warning notification to a user when their post is warned by admin
 */
export const sendWarningNotificationToUser = async (
  userId: string,
  postId: string,
  adminId?: string
): Promise<void> => {
  try {
    const notification: Omit<UserNotification, 'id'> = {
      userId,
      type: 'warning',
      title: 'Community Guidelines Warning',
      message: 'A post you shared was reviewed by our admin team after being reported. We encourage you to review our community guidelines to help keep the community positive and respectful. Repeated violations may lead to temporary restrictions or permanent ban.',
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedPostId: postId,
      adminId
    };

    await addDoc(collection(db, USER_NOTIFICATIONS_COLLECTION), notification);
    console.log('Warning notification sent successfully to user:', userId);
  } catch (error) {
    console.error('Error sending warning notification:', error);
    throw new Error('Failed to send warning notification');
  }
};

/**
 * Send a general notification to a user
 */
export const sendNotificationToUser = async (
  userId: string,
  type: UserNotification['type'],
  title: string,
  message: string,
  adminId?: string,
  relatedPostId?: string
): Promise<void> => {
  try {
    const notification: Omit<UserNotification, 'id'> = {
      userId,
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      adminId,
      relatedPostId
    };

    await addDoc(collection(db, USER_NOTIFICATIONS_COLLECTION), notification);
    console.log('Notification sent successfully to user:', userId);
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new Error('Failed to send notification');
  }
};
