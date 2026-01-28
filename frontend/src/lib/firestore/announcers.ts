import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Announcer } from "@/types/export";
import { ANNOUNCER_STATUS } from "@/types/constants";

export async function fetchAnnouncers(): Promise<Announcer[]> {
    const snapshot = await getDocs(collection(db, "announcers"));

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Announcer, 'id'>)
    }));
}

export interface NewAnnouncerData {
    name: string;
    email: string;
    password: string;
    affiliation_name: string;
    affiliation_type: string;
    phone: string;
    role: string;
    profilePicture?: string; // Optional
}

export async function addAnnouncer(announcerData: NewAnnouncerData): Promise<string> {
    const newAnnouncer = {
        ...announcerData,
        status: ANNOUNCER_STATUS.ACTIVE,
        total_announcements: 0,
        joined_date: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "announcers"), newAnnouncer);
    return docRef.id;
}

export interface UpdateAnnouncerData {
    name: string;
    email: string;
    password?: string; // Optional - only update if provided
    affiliation_name: string;
    affiliation_type: string;
    phone: string;
    role: string;
    profilePicture?: string; // Optional - profile picture URL
}

export async function updateAnnouncer(announcerId: string, announcerData: UpdateAnnouncerData): Promise<void> {
    const announcerRef = doc(db, "announcers", announcerId);
    
    // Only include password in update if it's provided (not empty)
    const updateData: any = {
        name: announcerData.name,
        email: announcerData.email,
        affiliation_name: announcerData.affiliation_name,
        affiliation_type: announcerData.affiliation_type,
        phone: announcerData.phone,
        role: announcerData.role
    };
    
    // Only update password if a new one is provided
    if (announcerData.password && announcerData.password.trim() !== '') {
        updateData.password = announcerData.password;
    }
    
    // Only update profile picture if provided
    if (announcerData.profilePicture) {
        updateData.profilePicture = announcerData.profilePicture;
    }
    
    await updateDoc(announcerRef, updateData);
}

export async function updateAnnouncerProfilePicture(announcerId: string, profilePictureUrl: string): Promise<void> {
    const announcerRef = doc(db, "announcers", announcerId);
    await updateDoc(announcerRef, { profilePicture: profilePictureUrl });
}