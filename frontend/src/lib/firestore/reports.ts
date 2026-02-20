import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Report } from "@/types/export";

/**
 * Get all reports from Firestore
 */
export const getReports = async (): Promise<Report[]> => {
  try {
    const reportsCollection = collection(db, 'reports');
    const q = query(reportsCollection, orderBy('reportDate', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time reports updates
 */
export const subscribeToReports = (
  callback: (reports: Report[]) => void
): Unsubscribe => {
  const reportsCollection = collection(db, 'reports');
  const q = query(reportsCollection, orderBy('reportDate', 'desc'));

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const reports: Report[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
    callback(reports);
  }, (error) => {
    console.error('Error in reports subscription:', error);
  });
};

/**
 * Subscribe to recent reports for dashboard (real-time, limited to 5)
 * Note: Sorts in memory to avoid requiring a composite index
 */
export const subscribeToRecentReports = (
  callback: (reports: Report[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const reportsCollection = collection(db, 'reports');
  const q = query(
    reportsCollection,
    where('status', '==', 'pending'),
    limit(50) // Get more to sort in memory
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const reports: Report[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Report))
        .sort((a, b) => {
          // Sort by reportDate descending
          const dateA = (a.reportDate as any)?.toDate ? (a.reportDate as any).toDate().getTime() : 0;
          const dateB = (b.reportDate as any)?.toDate ? (b.reportDate as any).toDate().getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5); // Take top 5 after sorting
      callback(reports);
    },
    (error) => {
      console.error('Error in recent reports subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
};

/**
 * Get reports by status
 */
export const getReportsByStatus = async (status: string): Promise<Report[]> => {
  try {
    const reportsCollection = collection(db, 'reports');
    const q = query(
      reportsCollection,
      where('status', '==', status),
      orderBy('reportDate', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
  } catch (error) {
    console.error('Error fetching reports by status:', error);
    throw error;
  }
};

/**
 * Get reports by category
 */
export const getReportsByCategory = async (category: string): Promise<Report[]> => {
  try {
    const reportsCollection = collection(db, 'reports');
    const q = query(
      reportsCollection,
      where('category', '==', category),
      orderBy('reportDate', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
  } catch (error) {
    console.error('Error fetching reports by category:', error);
    throw error;
  }
};

/**
 * Update report status
 */
export const updateReportStatus = async (reportId: string, status: string): Promise<void> => {
  try {
    const reportDoc = doc(db, 'reports', reportId);
    await updateDoc(reportDoc, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
};

/**
 * Resolve all reports for a specific post (when post is warned)
 */
export const resolveReportsByPostId = async (postId: string): Promise<void> => {
  try {
    const reportsCollection = collection(db, 'reports');
    const q = query(reportsCollection, where('postId', '==', postId));
    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        status: 'resolved',
        updatedAt: new Date().toISOString()
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error resolving reports by postId:', error);
    throw error;
  }
};

/**
 * Resolve all reports for multiple posts (when user is warned)
 */
export const resolveReportsByPostIds = async (postIds: string[]): Promise<void> => {
  try {
    const reportsCollection = collection(db, 'reports');

    // Process in batch to avoid Firebase limitations
    const batchSize = 10;
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batchPostIds = postIds.slice(i, i + batchSize);
      const q = query(reportsCollection, where('postId', 'in', batchPostIds));
      const snapshot = await getDocs(q);

      const updatePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          status: 'resolved',
          updatedAt: new Date().toISOString()
        })
      );

      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.error('Error resolving reports by postIds:', error);
    throw error;
  }
};

/**
 * Get urgent reports (high report count)
 */
export const getUrgentReports = async (threshold: number = 5): Promise<Report[]> => {
  try {
    const reportsCollection = collection(db, 'reports');
    const q = query(
      reportsCollection,
      where('reportCount', '>=', threshold),
      where('status', '==', 'pending'),
      orderBy('reportCount', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Report));
  } catch (error) {
    console.error('Error fetching urgent reports:', error);
    throw error;
  }
};