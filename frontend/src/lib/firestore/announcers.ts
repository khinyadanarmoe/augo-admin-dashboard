import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
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
    affiliation_name: string;
    affiliation_type: string;
    phone?: string;
    role?: string;
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