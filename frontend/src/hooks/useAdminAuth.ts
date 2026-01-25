import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/router';

export const useAdminAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
        return;
      }

      try {
        const token = await user.getIdTokenResult(true);
        if (!token.claims.admin) {
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push('/login');
          return;
        }

        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return { isAuthenticated, isLoading };
};