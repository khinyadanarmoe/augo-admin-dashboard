import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, query, orderBy, onSnapshot, Unsubscribe, QuerySnapshot, DocumentData, where, limit } from 'firebase/firestore';
import { Announcement } from '@/types';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

export interface NewAnnouncementData {
  title: string;
  department: string;
  body: string;
  startDate: Date;
  endDate: Date;
  status: string;
  link?: string;
  latitude?: number;
  longitude?: number;
  isUrgent?: boolean;
  createdByUID?: string;
}

export interface UpdateAnnouncementData {
  title?: string;
  department?: string;
  body?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  link?: string;
  latitude?: number;
  longitude?: number;
  isUrgent?: boolean;
}

/**
 * Fetch all announcements from Firestore
 */
export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const announcementsRef = collection(db, ANNOUNCEMENTS_COLLECTION);
    const snapshot = await getDocs(announcementsRef);

    const announcements = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        department: data.department || '',
        body: data.body,
        startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
        status: data.status || 'pending',
        link: data.link,
        latitude: data.latitude,
        longitude: data.longitude,
        isUrgent: data.isUrgent || false,
        createdByUID: data.createdByUID,
        createdByName: data.createdByName,
        createdByEmail: data.createdByEmail,
        submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : data.submittedAt,
        rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate().toISOString() : data.rejectedAt,
        views: data.views || 0,
        photoPaths: data.photoPaths || []
      } as Announcement;
    });

    // Sort by startDate
    return announcements.sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
};

/**
 * Subscribe to real-time announcements updates
 */
export const subscribeToAnnouncements = (
  callback: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const announcementsRef = collection(db, ANNOUNCEMENTS_COLLECTION);
  const q = query(announcementsRef, orderBy('startDate', 'desc'));

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const announcements: Announcement[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          department: data.department || '',
          body: data.body,
          startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
          endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
          status: data.status || 'pending',
          link: data.link,
          latitude: data.latitude,
          longitude: data.longitude,
          isUrgent: data.isUrgent || false,
          createdByUID: data.createdByUID,
          createdByName: data.createdByName,
          createdByEmail: data.createdByEmail,
          submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : data.submittedAt,
          rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate().toISOString() : data.rejectedAt,
          views: data.views || 0,
          photoPaths: data.photoPaths || []
        } as Announcement;
      });
      callback(announcements);
    },
    (error) => {
      console.error('Error in announcements subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

/**
 * Subscribe to pending announcements for dashboard (real-time)
 */
export const subscribeToPendingAnnouncements = (
  callback: (announcements: Announcement[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const announcementsRef = collection(db, ANNOUNCEMENTS_COLLECTION);
  const q = query(
    announcementsRef,
    where('status', '==', 'pending'),
    limit(5)
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const announcements: Announcement[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          department: data.department || '',
          body: data.body,
          startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : data.startDate,
          endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : data.endDate,
          status: data.status || 'pending',
          link: data.link,
          latitude: data.latitude,
          longitude: data.longitude,
          isUrgent: data.isUrgent || false,
          createdByUID: data.createdByUID,
          createdByName: data.createdByName,
          createdByEmail: data.createdByEmail,
          submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate().toISOString() : data.submittedAt,
          rejectedAt: data.rejectedAt?.toDate ? data.rejectedAt.toDate().toISOString() : data.rejectedAt,
          views: data.views || 0,
          photoPaths: data.photoPaths || []
        } as Announcement;
      });
      callback(announcements);
    },
    (error) => {
      console.error('Error in pending announcements subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

/**
 * Fetch a single announcement by ID
 */
export const fetchAnnouncementById = async (id: string): Promise<Announcement | null> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    const snapshot = await getDoc(announcementDoc);

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as Announcement;
    }
    return null;
  } catch (error) {
    console.error('Error fetching announcement:', error);
    throw error;
  }
};

/**
 * Add a new announcement to Firestore
 */
export const addAnnouncement = async (data: NewAnnouncementData): Promise<string> => {
  try {
    const announcementData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), announcementData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding announcement:', error);
    throw error;
  }
};

/**
 * Update an existing announcement
 */
export const updateAnnouncement = async (id: string, data: UpdateAnnouncementData): Promise<void> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(announcementDoc, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (id: string): Promise<void> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await deleteDoc(announcementDoc);
  } catch (error) {
    console.error('Error deleting announcement:', error);
    throw error;
  }
};

/**
 * Increment view count for an announcement
 */
export const incrementAnnouncementViews = async (id: string): Promise<void> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    const snapshot = await getDoc(announcementDoc);

    if (snapshot.exists()) {
      const currentViews = snapshot.data().views || 0;
      await updateDoc(announcementDoc, {
        views: currentViews + 1
      });
    }
  } catch (error) {
    console.error('Error incrementing announcement views:', error);
    throw error;
  }
};

/**
 * Approve an announcement and set it to scheduled status
 */
export const approveAnnouncement = async (id: string): Promise<void> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(announcementDoc, {
      status: 'scheduled',
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error approving announcement:', error);
    throw error;
  }
};

/**
 * Decline an announcement
 */
export const declineAnnouncement = async (id: string): Promise<void> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(announcementDoc, {
      status: 'declined',
      rejectedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error declining announcement:', error);
    throw error;
  }
};

/**
 * Remove an announcement (soft delete)
 */
export const removeAnnouncement = async (id: string): Promise<void> => {
  try {
    const announcementDoc = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(announcementDoc, {
      status: 'removed',
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error removing announcement:', error);
    throw error;
  }
};

/**
 * Check and update announcement statuses based on current time
 * This function handles both scheduled->active and active->expired transitions
 */
export const processAnnouncementStatusTransitions = async (): Promise<{
  activated: number;
  expired: number;
}> => {
  try {
    const now = new Date();
    const announcements = await fetchAnnouncements();

    let activated = 0;
    let expired = 0;

    // Find scheduled announcements that should be active
    const scheduledToActivate = announcements.filter(announcement => {
      if (announcement.status !== 'scheduled') return false;
      const startDate = new Date(announcement.startDate);
      return now >= startDate;
    });

    // Find active announcements that should be expired
    const activeToExpire = announcements.filter(announcement => {
      if (announcement.status !== 'active') return false;
      const endDate = new Date(announcement.endDate);
      return now > endDate;
    });

    // Update scheduled announcements to active
    if (scheduledToActivate.length > 0) {
      await Promise.all(
        scheduledToActivate.map(announcement =>
          updateAnnouncement(announcement.id, { status: 'active' })
        )
      );
      activated = scheduledToActivate.length;
    }

    // Update active announcements to expired
    if (activeToExpire.length > 0) {
      await Promise.all(
        activeToExpire.map(announcement =>
          updateAnnouncement(announcement.id, { status: 'expired' })
        )
      );
      expired = activeToExpire.length;
    }

    console.log(`Status transitions: ${activated} activated, ${expired} expired`);
    return { activated, expired };
  } catch (error) {
    console.error('Error processing announcement status transitions:', error);
    throw error;
  }
};
