import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

const AR_SPAWNS_COLLECTION = 'ar_spawns';

export interface ARSpawnData {
  id?: string;
  title: string;
  description: string;
  assetPath: string;
  preview: string;
  latitude: number;
  longitude: number;
  catchRadius: number;
  revealRadius: number;
  catchable_time: number;
  coin_value: number;
  point: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Fetch all AR spawns
 */
export async function fetchARSpawns(): Promise<ARSpawnData[]> {
  try {
    const arSpawnsRef = collection(db, AR_SPAWNS_COLLECTION);
    const q = query(arSpawnsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ARSpawnData[];
  } catch (error) {
    console.error('Error fetching AR spawns:', error);
    throw error;
  }
}

/**
 * Fetch a single AR spawn by ID
 */
export async function fetchARSpawnById(id: string): Promise<ARSpawnData | null> {
  try {
    const docRef = doc(db, AR_SPAWNS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as ARSpawnData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching AR spawn:', error);
    throw error;
  }
}

/**
 * Add a new AR spawn
 */
export async function addARSpawn(data: Omit<ARSpawnData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, AR_SPAWNS_COLLECTION), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    console.log('AR spawn added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding AR spawn:', error);
    throw error;
  }
}

/**
 * Update an existing AR spawn
 */
export async function updateARSpawn(id: string, data: Partial<ARSpawnData>): Promise<void> {
  try {
    const docRef = doc(db, AR_SPAWNS_COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    console.log('AR spawn updated:', id);
  } catch (error) {
    console.error('Error updating AR spawn:', error);
    throw error;
  }
}

/**
 * Delete an AR spawn
 */
export async function deleteARSpawn(id: string): Promise<void> {
  try {
    const docRef = doc(db, AR_SPAWNS_COLLECTION, id);
    await deleteDoc(docRef);
    console.log('AR spawn deleted:', id);
  } catch (error) {
    console.error('Error deleting AR spawn:', error);
    throw error;
  }
}

/**
 * Toggle AR spawn active status
 */
export async function toggleARSpawnStatus(id: string, isActive: boolean): Promise<void> {
  try {
    const docRef = doc(db, AR_SPAWNS_COLLECTION, id);
    await updateDoc(docRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });
    console.log('AR spawn status toggled:', id, isActive);
  } catch (error) {
    console.error('Error toggling AR spawn status:', error);
    throw error;
  }
}

/**
 * Fetch active AR spawns near a location
 */
export async function fetchActiveARSpawnsNearLocation(
  latitude: number, 
  longitude: number, 
  radiusInKm: number = 10
): Promise<ARSpawnData[]> {
  try {
    // Note: For production, consider using geohashing or Firebase GeoPoint queries
    // This is a simple implementation that fetches all active spawns
    const arSpawnsRef = collection(db, AR_SPAWNS_COLLECTION);
    const q = query(arSpawnsRef, where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    
    const spawns = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ARSpawnData[];
    
    // Filter by distance (simple implementation)
    return spawns.filter(spawn => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        spawn.latitude, 
        spawn.longitude
      );
      return distance <= radiusInKm;
    });
  } catch (error) {
    console.error('Error fetching nearby AR spawns:', error);
    throw error;
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
