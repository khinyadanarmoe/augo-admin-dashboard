import React from 'react';
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Converts a Firebase Storage path to a download URL
 * 
 * @param storagePath - The storage path (e.g., "announcers/123/profile.jpg")
 * @returns Download URL or null if path is invalid
 * 
 * @example
 * const url = await getStorageUrl("announcers/abc123/profile.jpg");
 * // Returns: "https://firebasestorage.googleapis.com/..."
 */
export async function getStorageUrl(storagePath: string | undefined | null): Promise<string | null> {
    if (!storagePath) return null;
    
    try {
        const storageRef = ref(storage, storagePath);
        const url = await getDownloadURL(storageRef);
        return url;
    } catch (error) {
        console.error(`Failed to get download URL for path: ${storagePath}`, error);
        return null;
    }
}

/**
 * Converts multiple storage paths to download URLs
 * 
 * @param storagePaths - Array of storage paths
 * @returns Array of download URLs (null for failed conversions)
 * 
 * @example
 * const urls = await getStorageUrls([
 *   "announcers/abc/profile.jpg",
 *   "3d_models/ar/monsters/sleepy.usdz"
 * ]);
 */
export async function getStorageUrls(storagePaths: (string | undefined | null)[]): Promise<(string | null)[]> {
    return Promise.all(storagePaths.map(path => getStorageUrl(path)));
}

/**
 * React hook to get a storage URL from a path
 * Automatically fetches URL when path changes
 * 
 * @param storagePath - The storage path
 * @returns Object with url, loading state, and error
 * 
 * @example
 * const { url, loading, error } = useStorageUrl(announcer.profilePicture);
 * 
 * if (loading) return <Spinner />;
 * if (error) return <DefaultAvatar />;
 * return <img src={url} alt="Profile" />;
 */
export function useStorageUrl(storagePath: string | undefined | null) {
    const [url, setUrl] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (!storagePath) {
            setUrl(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        
        getStorageUrl(storagePath)
            .then(downloadUrl => {
                if (!cancelled) {
                    setUrl(downloadUrl);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setError(err);
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [storagePath]);

    return { url, loading, error };
}
