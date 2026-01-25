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
  Unsubscribe
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