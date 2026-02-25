import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { Announcer } from "@/types/export";
import { ANNOUNCER_STATUS } from "@/types/constants";
import { httpsCallable } from "firebase/functions";

export async function fetchAnnouncers(): Promise<Announcer[]> {
    const snapshot = await getDocs(collection(db, "announcers"));

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Announcer, 'id'>)
    }));
}

/**
 * Fetch a single announcer by ID
 */
export async function fetchAnnouncerById(id: string): Promise<Announcer | null> {
    try {
        const announcerDoc = doc(db, "announcers", id);
        const snapshot = await getDoc(announcerDoc);

        if (snapshot.exists()) {
            return {
                id: snapshot.id,
                ...(snapshot.data() as Omit<Announcer, 'id'>)
            } as Announcer;
        }
        return null;
    } catch (error) {
        console.error('Error fetching announcer:', error);
        return null;
    }
}

export interface NewAnnouncerData {
    name: string;
    email: string;
    password: string;
    affiliation_name: string;
    affiliation_type: string;
    phone: string;
    role: string;
    profilePicture?: string; // Optional - storage path (e.g., "announcers/{id}/profile.jpg")
}

/**
 * ✅ Creates announcer via Cloud Function (Firebase Auth + Custom Claims + Firestore)
 * This is the enterprise-level approach - NO passwords in Firestore!
 */
export async function addAnnouncer(announcerData: NewAnnouncerData): Promise<string> {
    try {
        const createAnnouncerFn = httpsCallable(functions, 'createAnnouncer');

        const result = await createAnnouncerFn({
            email: announcerData.email,
            password: announcerData.password,
            name: announcerData.name,
            affiliation_name: announcerData.affiliation_name,
            affiliation_type: announcerData.affiliation_type,
            phone: announcerData.phone,
            role: announcerData.role,
            profilePicture: announcerData.profilePicture
        });

        const data = result.data as { success: boolean; uid: string; message: string };

        if (!data.success) {
            throw new Error(data.message || 'Failed to create announcer');
        }

        return data.uid; // Return the Firebase Auth UID (which is also the Firestore doc ID)
    } catch (error: any) {
        console.error('Error creating announcer:', error);
        throw new Error(error.message || 'Failed to create announcer');
    }
}

export interface UpdateAnnouncerData {
    name: string;
    email: string;
    password?: string; // Optional - only update if provided
    affiliation_name: string;
    affiliation_type: string;
    phone: string;
    role: string;
    profilePicture?: string; // Optional - storage path (e.g., "announcers/{id}/profile.jpg")
}

/**
 * ✅ Updates announcer via Cloud Function (updates both Auth and Firestore)
 */
export async function updateAnnouncer(announcerId: string, announcerData: UpdateAnnouncerData): Promise<void> {
    try {
        const updateAnnouncerFn = httpsCallable(functions, 'updateAnnouncer');

        const updatePayload: any = {
            announcerId,
            name: announcerData.name,
            email: announcerData.email,
            affiliation_name: announcerData.affiliation_name,
            affiliation_type: announcerData.affiliation_type,
            phone: announcerData.phone,
            role: announcerData.role
        };

        // Only include password if it's being changed
        if (announcerData.password && announcerData.password.trim() !== '') {
            updatePayload.password = announcerData.password;
        }

        // Only include profile picture if provided
        if (announcerData.profilePicture) {
            updatePayload.profilePicture = announcerData.profilePicture;
        }

        const result = await updateAnnouncerFn(updatePayload);
        const data = result.data as { success: boolean; message: string };

        if (!data.success) {
            throw new Error(data.message || 'Failed to update announcer');
        }
    } catch (error: any) {
        console.error('Error updating announcer:', error);
        throw new Error(error.message || 'Failed to update announcer');
    }
}

/**
 * Updates only the profile picture in Firestore
 * This is a lightweight update that doesn't require Cloud Function
 * @param announcerId - The announcer's UID
 * @param profilePicturePath - Storage path (e.g., "announcers/{id}/profile.jpg")
 */
export async function updateAnnouncerProfilePicture(announcerId: string, profilePicturePath: string): Promise<void> {
    const announcerRef = doc(db, "announcers", announcerId);
    await updateDoc(announcerRef, { profilePicture: profilePicturePath });
}