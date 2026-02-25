/**
 * Business Rules Service
 * This service enforces all the configuration-based business rules across the application
 * 
 * Report Severity Rules:
 * - HIGH (🔴): Threats/Violence, Inappropriate, Hate Speech, Scam
 *   → Auto-removes post immediately via Cloud Function
 *   → Sends notification to reported user
 *   → Marks report as resolved
 * 
 * - MEDIUM (🟡): Harassment, Impersonation, Misinformation
 *   → Requires manual review and admin action
 * 
 * - LOW (🟢): Spam
 *   → Requires manual review
 * 
 * - OTHER (🟤): Other violations
 *   → Requires manual review
 */

import { AdminConfiguration } from '@/types';
import { getAdminConfiguration } from './firestore/configuration';

export interface PostValidationResult {
  isValid: boolean;
  errors: string[];
  canPost: boolean;
}

export interface PostModerationInfo {
  severityLevel: 'normal' | 'warning' | 'urgent';
  requiresUrgentReview: boolean;
  shouldNotifyAdmin: boolean;
}

/**
 * Service class for enforcing business rules
 */
export class BusinessRulesService {
  private static instance: BusinessRulesService;
  private config: AdminConfiguration | null = null;

  private constructor() { }

  static getInstance(): BusinessRulesService {
    if (!BusinessRulesService.instance) {
      BusinessRulesService.instance = new BusinessRulesService();
    }
    return BusinessRulesService.instance;
  }

  /**
   * Initialize the service with current configuration
   */
  async initialize(): Promise<void> {
    try {
      this.config = await getAdminConfiguration();
    } catch (error) {
      console.error('Failed to initialize BusinessRulesService:', error);
      throw error;
    }
  }

  /**
   * Update the service configuration
   */
  updateConfiguration(newConfig: AdminConfiguration): void {
    this.config = newConfig;
  }

  /**
   * Ensure configuration is loaded
   */
  private async ensureConfigLoaded(): Promise<AdminConfiguration> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config!;
  }

  /**
   * Validate if a student can create a new post
   */
  async validatePostCreation(
    userId: string,
    userDailyPostCount: number,
    isAnnouncement: boolean = false
  ): Promise<PostValidationResult> {
    const config = await this.ensureConfigLoaded();
    const errors: string[] = [];

    // Announcements are not subject to daily limits
    if (!isAnnouncement) {
      if (userDailyPostCount >= config.dailyFreePostLimit) {
        errors.push(
          `Daily post limit of ${config.dailyFreePostLimit} posts exceeded. ` +
          `Your limit will reset at midnight.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      canPost: errors.length === 0
    };
  }

  /**
   * Calculate post expiration date
   */
  async calculatePostExpiration(
    createdDate: Date = new Date(),
    isAnnouncement: boolean = false
  ): Promise<Date | null> {
    // Announcements don't expire based on configuration
    if (isAnnouncement) {
      return null;
    }

    const config = await this.ensureConfigLoaded();
    const expirationDate = new Date(createdDate);
    expirationDate.setHours(expirationDate.getHours() + config.postVisibilityDuration);

    return expirationDate;
  }

  /**
   * Check if a post has expired
   */
  async isPostExpired(
    createdDate: Date,
    isAnnouncement: boolean = false
  ): Promise<boolean> {
    if (isAnnouncement) return false;

    const expirationDate = await this.calculatePostExpiration(createdDate, isAnnouncement);
    return expirationDate ? new Date() > expirationDate : false;
  }

  /**
   * Evaluate post moderation status based on report count
   */
  async evaluatePostModeration(
    postId: string,
    reportCount: number,
    postContent: string,
    userId: string
  ): Promise<PostModerationInfo> {
    const config = await this.ensureConfigLoaded();
    const thresholds = config.reportThresholds;

    let severityLevel: 'normal' | 'warning' | 'urgent' = 'normal';
    let requiresUrgentReview = false;
    let shouldNotifyAdmin = false;

    if (reportCount >= thresholds.urgent) {
      severityLevel = 'urgent';
      requiresUrgentReview = true;
      shouldNotifyAdmin = true;

      // Note: Urgent notifications are now handled automatically by the NotificationBell component
      // which monitors posts in real-time based on report counts

    } else if (reportCount >= thresholds.warning) {
      severityLevel = 'warning';
    }

    return {
      severityLevel,
      requiresUrgentReview,
      shouldNotifyAdmin
    };
  }

  /**
   * Get the current emoji pin price
   */
  async getEmojiPinPrice(): Promise<number> {
    const config = await this.ensureConfigLoaded();
    return config.emojiPinPrice;
  }

  /**
   * Filter expired posts from a list
   */
  async filterActivePosts(posts: Array<{
    id: string;
    createdDate: string;
    isAnnouncement?: boolean;
  }>): Promise<typeof posts> {
    const activePostsPromises = posts.map(async (post) => {
      const isExpired = await this.isPostExpired(
        new Date(post.createdDate),
        post.isAnnouncement || false
      );
      return isExpired ? null : post;
    });

    const results = await Promise.all(activePostsPromises);
    return results.filter((post): post is NonNullable<typeof post> => post !== null);
  }



  /**
   * Apply business rules to a post update
   */
  async applyPostUpdateRules(
    postId: string,
    updates: {
      reportCount?: number;
      content?: string;
      userId?: string;
    }
  ): Promise<{
    allowUpdate: boolean;
    warnings: string[];
    moderationInfo?: PostModerationInfo;
  }> {
    const warnings: string[] = [];
    let moderationInfo: PostModerationInfo | undefined;

    // If report count is being updated, evaluate moderation status
    if (updates.reportCount !== undefined && updates.content && updates.userId) {
      moderationInfo = await this.evaluatePostModeration(
        postId,
        updates.reportCount,
        updates.content,
        updates.userId
      );

      if (moderationInfo.requiresUrgentReview) {
        warnings.push('This post now requires urgent administrative review');
      }
    }

    return {
      allowUpdate: true, // In most cases, updates are allowed
      warnings,
      moderationInfo
    };
  }
}

// Export a singleton instance
export const businessRules = BusinessRulesService.getInstance();

/**
 * Initialize business rules on app startup
 */
export const initializeBusinessRules = async (): Promise<void> => {
  try {
    await businessRules.initialize();
    console.log('Business rules service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize business rules service:', error);
    throw error;
  }
};