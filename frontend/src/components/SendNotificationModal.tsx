import React, { useState } from 'react';
import { sendCommunityWarning, sendTemporaryBan, sendPermanentBan } from '@/lib/notifications';

interface SendNotificationProps {
  userId: string;
  adminId: string;
  relatedPostId?: string;
  onNotificationSent?: (notificationId: string) => void;
  className?: string;
}

const SendNotificationModal: React.FC<SendNotificationProps> = ({
  userId,
  adminId,
  relatedPostId,
  onNotificationSent,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notificationType, setNotificationType] = useState<'warning' | 'temp_ban' | 'perm_ban'>('warning');
  const [customMessage, setCustomMessage] = useState('');
  const [banDuration, setBanDuration] = useState('3 days');
  const [banReason, setBanReason] = useState('');

  const handleSendNotification = async () => {
    setIsLoading(true);
    try {
      let notificationId: string;

      switch (notificationType) {
        case 'warning':
          notificationId = await sendCommunityWarning(
            userId,
            adminId,
            relatedPostId || '',
            customMessage || undefined
          );
          break;
        
        case 'temp_ban':
          notificationId = await sendTemporaryBan(
            userId,
            adminId,
            banDuration,
            banReason,
            relatedPostId
          );
          break;
        
        case 'perm_ban':
          notificationId = await sendPermanentBan(
            userId,
            adminId,
            banReason,
            relatedPostId
          );
          break;
      }

      alert('Notification sent successfully!');
      onNotificationSent?.(notificationId);
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Send User Notification
      </h3>

      {/* Notification Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Notification Type
        </label>
        <select
          value={notificationType}
          onChange={(e) => setNotificationType(e.target.value as any)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-zinc-700 dark:text-zinc-100"
        >
          <option value="warning">Community Guidelines Warning</option>
          <option value="temp_ban">Temporary Ban</option>
          <option value="perm_ban">Permanent Ban</option>
        </select>
      </div>

      {/* Warning Custom Message */}
      {notificationType === 'warning' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Custom Message (Optional)
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Leave empty to use default warning message"
            rows={3}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>
      )}

      {/* Ban Duration (for temporary ban) */}
      {notificationType === 'temp_ban' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Ban Duration
          </label>
          <select
            value={banDuration}
            onChange={(e) => setBanDuration(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-zinc-700 dark:text-zinc-100"
          >
            <option value="1 day">1 Day</option>
            <option value="3 days">3 Days</option>
            <option value="1 week">1 Week</option>
            <option value="2 weeks">2 Weeks</option>
            <option value="1 month">1 Month</option>
          </select>
        </div>
      )}

      {/* Ban Reason (for temp and permanent bans) */}
      {(notificationType === 'temp_ban' || notificationType === 'perm_ban') && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Reason for {notificationType === 'temp_ban' ? 'Temporary Ban' : 'Permanent Ban'}
          </label>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Enter the specific reason for this action"
            rows={3}
            required
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-zinc-700 dark:text-zinc-100"
          />
        </div>
      )}

      {/* User Info Display */}
      <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Target User ID:</strong> {userId}
        </p>
        {relatedPostId && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <strong>Related Post ID:</strong> {relatedPostId}
          </p>
        )}
      </div>

      {/* Send Button */}
      <button
        onClick={handleSendNotification}
        disabled={isLoading || (notificationType !== 'warning' && !banReason.trim())}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Sending...' : `Send ${notificationType === 'warning' ? 'Warning' : 'Ban'} Notification`}
      </button>

      {/* Warning Text */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
        This will immediately send a push notification to the user's device
      </p>
    </div>
  );
};

export default SendNotificationModal;