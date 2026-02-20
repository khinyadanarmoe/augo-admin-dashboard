import React, { useState } from "react";
import SendNotificationModal from "@/components/SendNotificationModal";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/contexts/ToastContext";

const TestNotificationsPage: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Notification System</h1>

      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Send Test Notification
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4">
              <SendNotificationModal
                userId="test-user-id" // Replace with actual user ID
                adminId="admin-id"
                relatedPostId="test-post-id"
                onNotificationSent={(id) => {
                  toast.success(`Notification created: ${id}`);
                  setShowModal(false);
                }}
              />
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestNotificationsPage;
