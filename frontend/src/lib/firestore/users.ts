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
 * Update user status (supports active, warning, suspended, banned)
 */
export const updateUserStatus = async (userId: string, status: string, suspendDurationDays: number = 30): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const updateData: Record<string, unknown> = {
      status: status,
      lastStatusUpdate: new Date().toISOString()
    };

    // If suspending user, set suspend timestamps and increment suspend count
    if (status === 'suspended') {
      const suspendedAt = new Date();
      const suspendExpiresAt = new Date();
      suspendExpiresAt.setDate(suspendExpiresAt.getDate() + suspendDurationDays);

      updateData.suspendedAt = suspendedAt.toISOString();
      updateData.suspendExpiresAt = suspendExpiresAt.toISOString();
      updateData.suspendCount = increment(1);
    } else if (status === 'banned') {
      // Permanent ban - set bannedAt timestamp
      updateData.bannedAt = new Date().toISOString();
    } else if (status === 'active') {
      // Clear suspend timestamps when unsuspending, keep suspend count for history
      updateData.suspendedAt = null;
      updateData.suspendExpiresAt = null;
    }

    await updateDoc(userRef, updateData);
    console.log('User status updated:', userId, status);
  } catch (error) {
    console.error('Error updating user status:', error);
    throw new Error('Failed to update user status');
  }
};

/**
 * Get user's current suspend count
 */
export const getUserSuspendCount = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().suspendCount || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting suspend count:', error);
    return 0;
  }
};