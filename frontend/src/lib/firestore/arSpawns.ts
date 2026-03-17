import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

const AR_SPAWNS_COLLECTION = 'ar_spawns';

export interface SpawnLocation {
  latitude: number;
  longitude: number;
  name?: string; // Optional name for this spawn point (e.g., "Library", "Cafeteria")
}

export interface ARSpawnData {
  id?: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  modelPath: string;
  previewPath: string;
  // Legacy single location (for backward compatibility)
  latitude: number;
  longitude: number;
  // New multi-location support
  spawnMode: 'fixed' | 'zone' | 'random'; // Default: 'fixed'
  fixedLocations?: SpawnLocation[]; // Array of spawn points for fixed mode
  catchRadius: number;
  revealRadius: number;
  rarity: string;
  catchable_time: number;
  coin_value: number;
  point: number;
  status: 'active' | 'inactive' | 'scheduled';
  isActive: boolean; // Derived from status: true if status === 'active'
  startTime?: string; // ISO 8601 datetime string for when AR model becomes available
  endTime?: string;   // ISO 8601 datetime string for when AR model stops being available
  createdAt?: any;
  updatedAt?: any;
}

export function calculateARSpawnStatus(
  startTime?: string,
  endTime?: string,
  fallbackStatus: ARSpawnData['status'] = 'active',
  now: Date = new Date()
): ARSpawnData['status'] {
  const parsedStartTime = startTime ? new Date(startTime) : null;
  const parsedEndTime = endTime ? new Date(endTime) : null;

  const hasValidStartTime =
    parsedStartTime !== null && !Number.isNaN(parsedStartTime.getTime());
  const hasValidEndTime =
    parsedEndTime !== null && !Number.isNaN(parsedEndTime.getTime());

  if (hasValidStartTime || hasValidEndTime) {
    if (hasValidStartTime && now < parsedStartTime) {
      return 'scheduled';
    }

    if (hasValidEndTime && now >= parsedEndTime) {
      return 'inactive';
    }

    return 'active';
  }

  return fallbackStatus;
}

function normalizeARSpawnData(
  id: string,
  data: Omit<ARSpawnData, 'id'>,
  now: Date
): ARSpawnData {
  const normalizedStatus = calculateARSpawnStatus(
    data.startTime,
    data.endTime,
    data.status,
    now
  );

  return {
    id,
    ...data,
    status: normalizedStatus,
    isActive: normalizedStatus === 'active',
  } as ARSpawnData;
}

async function syncARSpawnStatusIfNeeded(
  id: string,
  storedData: Omit<ARSpawnData, 'id'>,
  normalizedData: ARSpawnData
): Promise<void> {
  const storedStatus = storedData.status;
  const storedIsActive = storedData.isActive;

  if (
    storedStatus === normalizedData.status &&
    storedIsActive === normalizedData.isActive
  ) {
    return;
  }

  try {
    await updateDoc(doc(db, AR_SPAWNS_COLLECTION, id), {
      status: normalizedData.status,
      isActive: normalizedData.isActive,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.warn('Error syncing AR spawn status:', id, error);
  }
}

/**
 * Fetch all AR spawns
 */
export async function fetchARSpawns(): Promise<ARSpawnData[]> {
  try {
    const arSpawnsRef = collection(db, AR_SPAWNS_COLLECTION);
    const q = query(arSpawnsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const now = new Date();
    const spawns = querySnapshot.docs.map((docSnapshot) => {
      const rawData = docSnapshot.data() as Omit<ARSpawnData, 'id'>;

      return {
        rawData,
        normalizedData: normalizeARSpawnData(docSnapshot.id, rawData, now),
      };
    });

    await Promise.allSettled(
      spawns.map(({ rawData, normalizedData }) =>
        syncARSpawnStatusIfNeeded(normalizedData.id!, rawData, normalizedData)
      )
    );

    return spawns.map(({ normalizedData }) => normalizedData);
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
      const rawData = docSnap.data() as Omit<ARSpawnData, 'id'>;
      const normalizedData = normalizeARSpawnData(docSnap.id, rawData, new Date());

      await syncARSpawnStatusIfNeeded(docSnap.id, rawData, normalizedData);

      return normalizedData;
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
 * Update AR spawn status
 */
export async function updateARSpawnStatus(id: string, status: 'active' | 'inactive' | 'scheduled'): Promise<void> {
  try {
    const docRef = doc(db, AR_SPAWNS_COLLECTION, id);
    await updateDoc(docRef, {
      status,
      isActive: status === 'active',
      updatedAt: Timestamp.now(),
    });
    console.log('AR spawn status updated:', id, status);
  } catch (error) {
    console.error('Error updating AR spawn status:', error);
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
    // Note: For production, consider using geohashing or Firebase GeoPoint queries.
    // We fetch all spawns here because time-based status can become stale after create/edit.
    const arSpawnsRef = collection(db, AR_SPAWNS_COLLECTION);
    const querySnapshot = await getDocs(arSpawnsRef);
    const now = new Date();
    const spawns = querySnapshot.docs.map((docSnapshot) => {
      const rawData = docSnapshot.data() as Omit<ARSpawnData, 'id'>;

      return {
        rawData,
        normalizedData: normalizeARSpawnData(docSnapshot.id, rawData, now),
      };
    });

    await Promise.allSettled(
      spawns.map(({ rawData, normalizedData }) =>
        syncARSpawnStatusIfNeeded(normalizedData.id!, rawData, normalizedData)
      )
    );

    // Filter by distance (simple implementation)
    return spawns
      .map(({ normalizedData }) => normalizedData)
      .filter((spawn) => spawn.status === 'active')
      .filter(spawn => {
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
