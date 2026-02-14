import { db } from '../firebase';
import { collection, getDocs, setDoc, doc, query, where } from 'firebase/firestore';

export interface AffiliationData {
  name: string;
  type: 'faculty' | 'office' | 'student_org';
  isCustom: boolean;
  createdAt?: Date;
}

const AFFILIATIONS_COLLECTION = 'affiliations';

/**
 * Fetch all affiliations from Firestore
 */
export async function fetchAffiliations(): Promise<AffiliationData[]> {
  try {
    const affiliationsRef = collection(db, AFFILIATIONS_COLLECTION);
    const snapshot = await getDocs(affiliationsRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as AffiliationData[];
  } catch (error) {
    console.error('Error fetching affiliations:', error);
    return [];
  }
}

/**
 * Add a new custom affiliation to Firestore
 */
export async function addAffiliation(name: string, type: 'faculty' | 'office' | 'student_org'): Promise<void> {
  try {
    // Check if affiliation already exists
    const affiliationsRef = collection(db, AFFILIATIONS_COLLECTION);
    const q = query(affiliationsRef, where('name', '==', name), where('type', '==', type));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      console.log('Affiliation already exists');
      return;
    }
    
    // Add new affiliation
    const affiliationId = `${type}_${name.replace(/\s+/g, '_').toLowerCase()}`;
    await setDoc(doc(db, AFFILIATIONS_COLLECTION, affiliationId), {
      name,
      type,
      isCustom: true,
      createdAt: new Date()
    });
    
    console.log('Affiliation added successfully');
  } catch (error) {
    console.error('Error adding affiliation:', error);
    throw error;
  }
}

/**
 * Initialize default affiliations in Firestore (run once)
 */
export async function initializeDefaultAffiliations(): Promise<void> {
  const defaultAffiliations: AffiliationData[] = [
    // Faculty
    { name: 'Architecture and Design', type: 'faculty', isCustom: false },
    { name: 'Arts', type: 'faculty', isCustom: false },
    { name: 'Biotechnology', type: 'faculty', isCustom: false },
    { name: 'Communication Arts', type: 'faculty', isCustom: false },
    { name: 'Engineering and Computer Science', type: 'faculty', isCustom: false },
    { name: 'Law', type: 'faculty', isCustom: false },
    { name: 'Management and Economics', type: 'faculty', isCustom: false },
    { name: 'Music', type: 'faculty', isCustom: false },
    { name: 'Nursing Science', type: 'faculty', isCustom: false },
    
    // Office
    { name: 'Career Services', type: 'office', isCustom: false },
    { name: 'Emergency', type: 'office', isCustom: false },
    { name: 'Registrar', type: 'office', isCustom: false },
    { name: 'Student Affairs', type: 'office', isCustom: false },
    { name: 'Study Abroad', type: 'office', isCustom: false },
    
    // Student Organization
    { name: 'Accounting Committee', type: 'student_org', isCustom: false },
    { name: 'AIESEC', type: 'student_org', isCustom: false },
    { name: 'Art Committee', type: 'student_org', isCustom: false },
    { name: 'AUISC', type: 'student_org', isCustom: false },
    { name: 'AUMSC', type: 'student_org', isCustom: false },
    { name: 'AUSO', type: 'student_org', isCustom: false },
    { name: 'DBM Committee', type: 'student_org', isCustom: false },
    { name: 'VMES Committee', type: 'student_org', isCustom: false }
  ];
  
  try {
    const existingAffiliations = await fetchAffiliations();
    
    for (const affiliation of defaultAffiliations) {
      const exists = existingAffiliations.some(
        a => a.name === affiliation.name && a.type === affiliation.type
      );
      
      if (!exists) {
        const affiliationId = `${affiliation.type}_${affiliation.name.replace(/\s+/g, '_').toLowerCase()}`;
        await setDoc(doc(db, AFFILIATIONS_COLLECTION, affiliationId), {
          ...affiliation,
          createdAt: new Date()
        });
      }
    }
    
    console.log('Default affiliations initialized');
  } catch (error) {
    console.error('Error initializing default affiliations:', error);
    throw error;
  }
}
