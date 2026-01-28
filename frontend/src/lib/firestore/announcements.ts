import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
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
        views: data.views || 0
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
