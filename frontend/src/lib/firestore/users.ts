import { collection, getDocs, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/export";

export async function fetchUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, "users"));

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<User, 'id'>)
    }));
}

/**
 * Fetch a single user by ID
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...(userSnap.data() as Omit<User, 'id'>)
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Increment warning count for a user
 */
export const incrementUserWarningCount = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      warningCount: increment(1),
      lastWarningDate: new Date().toISOString()
    });
    console.log('User warning count incremented for user:', userId);
  } catch (error) {
    console.error('Error incrementing warning count:', error);
    throw new Error('Failed to increment user warning count');
  }
};

/**
 * Update user status
 */
export const updateUserStatus = async (userId: string, status: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: status,
      lastStatusUpdate: new Date().toISOString()
    });
    console.log('User status updated:', userId, status);
  } catch (error) {
    console.error('Error updating user status:', error);
    throw new Error('Failed to update user status');
  }
};