import { 
  collection, 
  getDocs, 
  query,
  orderBy,
  limit,
  startAfter,
  where,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';

const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';

/**
 * Get user name by userId
 */
const getUserName = async (userId: string): Promise<string> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.name || userData.nickname || 'Unknown User';
    }
    return 'Unknown User';
  } catch (error) {
    console.error('Error fetching user:', error);
    return 'Unknown User';
  }
};

/**
 * Get all posts from Firestore
 */
export const getAllPosts = async (): Promise<Post[]> => {
  try {
    const postsQuery = query(
      collection(db, POSTS_COLLECTION),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(postsQuery);
    const posts: Post[] = [];
    
    // Fetch all posts with user data
    const postPromises = querySnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      const userName = await getUserName(data.userId);
      
      return {
        id: docSnapshot.id,
        postDate: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString(),
        user: { id: data.userId || 'unknown', name: userName },
        content: data.content || '',
        category: data.category || 'casual',
        location: data.location || 'unknown',
        likes: data.likeCount || 0,
        dislikes: data.dislikeCount || 0,
        reportCount: data.reportCount || 0,
        status: data.status || 'active'
      };
    });
    
    const resolvedPosts = await Promise.all(postPromises);
    return resolvedPosts;
    
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error('Failed to fetch posts');
  }
};

/**
 * Subscribe to real-time posts updates
 */
export const subscribeToPostsUpdates = (
  callback: (posts: Post[]) => void,
  onError: (error: Error) => void
) => {
  const postsQuery = query(
    collection(db, POSTS_COLLECTION),
    orderBy('date', 'desc')
  );
  
  return onSnapshot(
    postsQuery,
    async (snapshot) => {
      try {
        const posts: Post[] = [];
        
        // Fetch all posts with user data
        const postPromises = snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data();
          const userName = await getUserName(data.userId);
          
          return {
            id: docSnapshot.id,
            postDate: data.date?.toDate ? data.date.toDate().toISOString() : new Date().toISOString(),
            user: { id: data.userId || 'unknown', name: userName },
            content: data.content || '',
            category: data.category || 'casual',
            location: data.location || 'unknown',
            likes: data.likeCount || 0,
            dislikes: data.dislikeCount || 0,
            reportCount: data.reportCount || 0,
            status: data.status || 'active'
          };
        });
        
        const resolvedPosts = await Promise.all(postPromises);
        callback(resolvedPosts);
      } catch (error) {
        console.error('Error processing posts snapshot:', error);
        onError(new Error('Failed to process posts updates'));
      }
    },
    (error) => {
      console.error('Posts subscription error:', error);
      onError(error);
    }
  );
};

/**
 * Update post status (warn, ban, etc.)
 */
export const updatePostStatus = async (postId: string, status: string): Promise<void> => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postRef, {
      status: status,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating post status:', error);
    throw new Error('Failed to update post status');
  }
};

/**
 * Delete a post
 */
export const deletePost = async (postId: string): Promise<void> => {
  try {
    const postRef = doc(db, POSTS_COLLECTION, postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.error('Error deleting post:', error);
    throw new Error('Failed to delete post');
  }
};