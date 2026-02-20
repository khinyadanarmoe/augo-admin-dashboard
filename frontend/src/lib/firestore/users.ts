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
export const updateUserStatus = async (userId: string, status: string, banDurationDays: number = 30): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      status: status,
      lastStatusUpdate: new Date().toISOString()
    };

    // If banning user, set ban timestamps with configurable duration
    if (status === 'banned') {
      const bannedAt = new Date();
      const banExpiresAt = new Date();
      banExpiresAt.setDate(banExpiresAt.getDate() + banDurationDays);

      updateData.bannedAt = bannedAt.toISOString();
      updateData.banExpiresAt = banExpiresAt.toISOString();
    } else {
      // If unbanning, clear ban timestamps
      updateData.bannedAt = null;
      updateData.banExpiresAt = null;
    }

    await updateDoc(userRef, updateData);
    console.log('User status updated:', userId, status);
  } catch (error) {
    console.error('Error updating user status:', error);
    throw new Error('Failed to update user status');
  }
};