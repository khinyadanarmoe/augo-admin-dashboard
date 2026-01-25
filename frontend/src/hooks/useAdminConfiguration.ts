import { useState, useEffect, useCallback } from 'react';
import { AdminConfiguration } from '@/types';
import { 
  getAdminConfiguration, 
  subscribeToConfiguration,
  DEFAULT_CONFIGURATION 
} from '@/lib/firestore/configuration';

/**
 * Hook for accessing and monitoring admin configuration settings
 * This allows components throughout the app to react to configuration changes
 */
export const useAdminConfiguration = () => {
  const [config, setConfig] = useState<AdminConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get initial configuration
        const initialConfig = await getAdminConfiguration();
        setConfig(initialConfig);

        // Subscribe to real-time updates
        unsubscribe = subscribeToConfiguration(
          (updatedConfig) => {
            setConfig(updatedConfig);
          },
          (subscriptionError) => {
            console.error('Configuration subscription error:', subscriptionError);
            setError('Failed to subscribe to configuration updates');
          }
        );

      } catch (err) {
        console.error('Error initializing configuration:', err);
        setError('Failed to load configuration');
        // Fallback to default configuration
        setConfig({
          id: 'default',
          ...DEFAULT_CONFIGURATION,
          lastUpdated: new Date().toISOString(),
          updatedBy: 'system'
        });
      } finally {
        setLoading(false);
      }
    };

    initializeConfig();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Helper functions for specific configuration checks
  const getPostVisibilityDuration = useCallback(() => {
    return config?.postVisibilityDuration || DEFAULT_CONFIGURATION.postVisibilityDuration;
  }, [config]);

  const getDailyFreePostLimit = useCallback(() => {
    return config?.dailyFreePostLimit || DEFAULT_CONFIGURATION.dailyFreePostLimit;
  }, [config]);

  const getReportThresholds = useCallback(() => {
    return config?.reportThresholds || DEFAULT_CONFIGURATION.reportThresholds;
  }, [config]);

  const getEmojiPinPrice = useCallback(() => {
    return config?.emojiPinPrice || DEFAULT_CONFIGURATION.emojiPinPrice;
  }, [config]);

  const getDailyFreeCoin = useCallback(() => {
    return config?.dailyFreeCoin || DEFAULT_CONFIGURATION.dailyFreeCoin;
  }, [config]);



  // Check if a post should be marked as urgent based on report count
  const shouldMarkPostAsUrgent = useCallback((reportCount: number) => {
    const thresholds = getReportThresholds();
    return reportCount >= thresholds.urgent;
  }, [getReportThresholds]);

  // Get the severity level of a post based on report count
  const getPostSeverityLevel = useCallback((reportCount: number): 'normal' | 'warning' | 'urgent' => {
    const thresholds = getReportThresholds();
    
    if (reportCount >= thresholds.urgent) return 'urgent';
    if (reportCount >= thresholds.warning) return 'warning';
    return 'normal';
  }, [getReportThresholds]);

  // Check if a student has reached their daily post limit
  const hasReachedDailyPostLimit = useCallback((currentPostCount: number) => {
    const dailyLimit = getDailyFreePostLimit();
    return currentPostCount >= dailyLimit;
  }, [getDailyFreePostLimit]);

  // Calculate when a post should expire (for new posts)
  const calculatePostExpirationDate = useCallback((createdDate: Date = new Date()) => {
    const visibilityHours = getPostVisibilityDuration();
    const expirationDate = new Date(createdDate);
    expirationDate.setHours(expirationDate.getHours() + visibilityHours);
    return expirationDate;
  }, [getPostVisibilityDuration]);

  // Check if a post has expired
  const isPostExpired = useCallback((createdDate: Date, isAnnouncement: boolean = false) => {
    // Announcements don't expire based on configuration
    if (isAnnouncement) return false;
    
    const expirationDate = calculatePostExpirationDate(createdDate);
    return new Date() > expirationDate;
  }, [calculatePostExpirationDate]);

  return {
    // Configuration state
    config,
    loading,
    error,
    
    // Helper getters
    getPostVisibilityDuration,
    getDailyFreePostLimit,
    getReportThresholds,
    getEmojiPinPrice,
    getDailyFreeCoin,
    
    // Business logic helpers (admin-relevant only)
    shouldMarkPostAsUrgent,
    getPostSeverityLevel,
    hasReachedDailyPostLimit,
    calculatePostExpirationDate,
    isPostExpired,
  };
};

/**
 * Hook for enforcing post visibility rules
 * This can be used in components that display posts to automatically filter expired content
 */
export const usePostVisibilityFilter = () => {
  const { isPostExpired } = useAdminConfiguration();

  const filterExpiredPosts = useCallback((posts: any[]) => {
    return posts.filter(post => {
      // Assume posts have a 'createdDate' field and 'isAnnouncement' field
      return !isPostExpired(new Date(post.createdDate), post.isAnnouncement);
    });
  }, [isPostExpired]);

  return { filterExpiredPosts, isPostExpired };
};

/**
 * Hook for post creation validation
 * This can be used in post creation forms to enforce daily limits and other rules
 */
export const usePostCreationValidation = () => {
  const { hasReachedDailyPostLimit, getDailyFreePostLimit } = useAdminConfiguration();

  const validatePostCreation = useCallback((userDailyPostCount: number) => {
    const errors: string[] = [];
    const dailyLimit = getDailyFreePostLimit();

    if (hasReachedDailyPostLimit(userDailyPostCount)) {
      errors.push(`You have reached your daily post limit of ${dailyLimit} posts. Your limit will reset tomorrow.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      canPost: !hasReachedDailyPostLimit(userDailyPostCount)
    };
  }, [hasReachedDailyPostLimit, getDailyFreePostLimit]);

  return { validatePostCreation };
};