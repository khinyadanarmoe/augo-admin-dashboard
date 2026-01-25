import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AdminConfiguration, ConfigurationLog } from '@/types';

const CONFIGURATION_COLLECTION = 'admin_configuration';
const CONFIGURATION_LOG_COLLECTION = 'configuration_logs';
const DEFAULT_CONFIG_ID = 'default';

// Default configuration values
export const DEFAULT_CONFIGURATION: Omit<AdminConfiguration, 'id' | 'lastUpdated' | 'updatedBy'> = {
  postVisibilityDuration: 24,
  dailyFreePostLimit: 3,
  reportThresholds: {
    normal: 2,
    warning: 5,
    urgent: 10
  },
  emojiPinPrice: 10,
  dailyFreeCoin: 10
};

/**
 * Get current admin configuration
 */
export const getAdminConfiguration = async (): Promise<AdminConfiguration> => {
  try {
    const configRef = doc(db, CONFIGURATION_COLLECTION, DEFAULT_CONFIG_ID);
    const configSnap = await getDoc(configRef);

    if (configSnap.exists()) {
      const data = configSnap.data();
      
      // Migrate old document structure - remove adminInterfaceSettings if it exists
      const cleanedData = {
        id: configSnap.id,
        postVisibilityDuration: data.postVisibilityDuration || DEFAULT_CONFIGURATION.postVisibilityDuration,
        dailyFreePostLimit: data.dailyFreePostLimit || DEFAULT_CONFIGURATION.dailyFreePostLimit,
        reportThresholds: data.reportThresholds || DEFAULT_CONFIGURATION.reportThresholds,
        emojiPinPrice: data.emojiPinPrice || DEFAULT_CONFIGURATION.emojiPinPrice,
        dailyFreeCoin: data.dailyFreeCoin || DEFAULT_CONFIGURATION.dailyFreeCoin,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        updatedBy: data.updatedBy || 'migration'
      };

      // If the document had old structure, update it to the new structure
      if (data.adminInterfaceSettings) {
        console.log('Migrating configuration document to remove adminInterfaceSettings...');
        await setDoc(configRef, cleanedData);
      }

      return cleanedData as AdminConfiguration;
    } else {
      // Create default configuration if it doesn't exist
      const currentUser = auth.currentUser;
      const defaultConfig: AdminConfiguration = {
        id: DEFAULT_CONFIG_ID,
        ...DEFAULT_CONFIGURATION,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.email || 'system'
      };

      await setDoc(configRef, defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error('Error fetching configuration:', error);
    
    // Return default configuration as fallback
    return {
      id: DEFAULT_CONFIG_ID,
      ...DEFAULT_CONFIGURATION,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'fallback'
    };
  }
};

/**
 * Update admin configuration with change logging
 */
export const updateAdminConfiguration = async (
  newConfig: Partial<Omit<AdminConfiguration, 'id' | 'lastUpdated' | 'updatedBy'>>,
  currentConfig: AdminConfiguration
): Promise<AdminConfiguration> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('User must be authenticated to update configuration');
  }

  try {
    // Prepare the updated configuration
    const updatedConfig: AdminConfiguration = {
      ...currentConfig,
      ...newConfig,
      lastUpdated: new Date().toISOString(),
      updatedBy: currentUser.email || 'unknown'
    };

    // Track changes for logging
    const changes: ConfigurationLog['changes'] = [];
    Object.keys(newConfig).forEach((key) => {
      const newValue = (newConfig as any)[key];
      const oldValue = (currentConfig as any)[key];
      
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue
        });
      }
    });

    // Update configuration in Firestore
    const configRef = doc(db, CONFIGURATION_COLLECTION, DEFAULT_CONFIG_ID);
    await setDoc(configRef, updatedConfig);

    // Log the changes if there are any
    if (changes.length > 0) {
      const logEntry: Omit<ConfigurationLog, 'id'> = {
        adminId: currentUser.uid,
        adminEmail: currentUser.email || 'unknown',
        timestamp: new Date().toISOString(),
        changes
      };

      await addDoc(collection(db, CONFIGURATION_LOG_COLLECTION), logEntry);
    }

    return updatedConfig;
  } catch (error) {
    console.error('Error updating configuration:', error);
    throw new Error('Failed to update configuration');
  }
};

/**
 * Subscribe to configuration changes
 */
export const subscribeToConfiguration = (
  callback: (config: AdminConfiguration) => void,
  onError: (error: Error) => void
) => {
  const configRef = doc(db, CONFIGURATION_COLLECTION, DEFAULT_CONFIG_ID);
  
  return onSnapshot(
    configRef,
    (doc) => {
      try {
        if (doc.exists()) {
          const config = { id: doc.id, ...doc.data() } as AdminConfiguration;
          callback(config);
        } else {
          // Document doesn't exist, create it with defaults
          const defaultConfig: AdminConfiguration = {
            id: DEFAULT_CONFIG_ID,
            ...DEFAULT_CONFIGURATION,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'system'
          };
          callback(defaultConfig);
        }
      } catch (callbackError) {
        console.error('Error in configuration callback:', callbackError);
        onError(new Error('Failed to process configuration changes'));
      }
    },
    (error) => {
      console.error('Error subscribing to configuration:', error);
      
      // Provide fallback configuration
      const fallbackConfig: AdminConfiguration = {
        id: DEFAULT_CONFIG_ID,
        ...DEFAULT_CONFIGURATION,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'fallback'
      };
      
      callback(fallbackConfig);
      
      // Still call onError but don't block the callback
      setTimeout(() => {
        onError(new Error('Failed to subscribe to configuration changes - using offline defaults'));
      }, 100);
    }
  );
};

/**
 * Get configuration change logs
 */
export const getConfigurationLogs = async (limitCount: number = 50): Promise<ConfigurationLog[]> => {
  try {
    const logsQuery = query(
      collection(db, CONFIGURATION_LOG_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    return new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(
        logsQuery,
        (snapshot) => {
          const logs: ConfigurationLog[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ConfigurationLog));
          resolve(logs);
          unsubscribe();
        },
        (error) => {
          console.error('Error fetching configuration logs:', error);
          reject(new Error('Failed to fetch configuration logs'));
        }
      );
    });
  } catch (error) {
    console.error('Error fetching configuration logs:', error);
    throw new Error('Failed to fetch configuration logs');
  }
};

/**
 * Check if current user has admin privileges
 */
export const checkAdminPrivileges = async (): Promise<boolean> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    return false;
  }

  try {
    const token = await currentUser.getIdTokenResult();
    return !!token.claims.admin;
  } catch (error) {
    console.error('Error checking admin privileges:', error);
    return false;
  }
};

/**
 * Validate configuration values
 */
export const validateConfiguration = (config: Partial<AdminConfiguration>): string[] => {
  const errors: string[] = [];

  if (config.postVisibilityDuration !== undefined) {
    if (config.postVisibilityDuration < 1 || config.postVisibilityDuration > 168) {
      errors.push('Post visibility duration must be between 1 and 168 hours');
    }
  }

  if (config.dailyFreePostLimit !== undefined) {
    if (config.dailyFreePostLimit < 0 || config.dailyFreePostLimit > 20) {
      errors.push('Daily free post limit must be between 0 and 20');
    }
  }

  if (config.reportThresholds !== undefined) {
    const { normal, warning, urgent } = config.reportThresholds;
    if (normal < 1 || warning < 1 || urgent < 1) {
      errors.push('All report thresholds must be at least 1');
    }
    if (normal >= warning || warning >= urgent) {
      errors.push('Report thresholds must be in ascending order: Normal < Warning < Urgent');
    }
  }

  if (config.emojiPinPrice !== undefined) {
    if (config.emojiPinPrice < 0.01 || config.emojiPinPrice > 99.99) {
      errors.push('Emoji pin price must be between $0.01 and $99.99');
    }
  }

  return errors;
};