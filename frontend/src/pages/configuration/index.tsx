import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";
import {
  getAdminConfiguration,
  updateAdminConfiguration,
  validateConfiguration,
  subscribeToConfiguration,
  getConfigurationLogs,
} from "@/lib/firestore/configuration";
import { AdminConfiguration, ConfigurationLog } from "@/types";

function Configuration() {
  // Configuration state
  const [config, setConfig] = useState<AdminConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form state (separate from config to allow editing without immediate persistence)
  const [formData, setFormData] = useState({
    postVisibilityDuration: 24,
    dailyFreePostLimit: 3,
    reportThresholds: {
      normal: 2,
      warning: 5,
      urgent: 10,
    },
    emojiPinPrice: 0.99,
    dailyFreeCoin: 10,
    maxActiveAnnouncements: 3,
    urgentAnnouncementThreshold: 48,
    banThreshold: 5,
    banDurationDays: 30,
  });

  // Load configuration on component mount
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setLoading(true);
        setError("");

        const configuration = await getAdminConfiguration();
        setConfig(configuration);
        setFormData({
          postVisibilityDuration: configuration.postVisibilityDuration,
          dailyFreePostLimit: configuration.dailyFreePostLimit,
          reportThresholds: configuration.reportThresholds,
          emojiPinPrice: configuration.emojiPinPrice,
          dailyFreeCoin: configuration.dailyFreeCoin || 10,
          maxActiveAnnouncements: configuration.maxActiveAnnouncements || 3,
          urgentAnnouncementThreshold:
            configuration.urgentAnnouncementThreshold || 48,
          banThreshold: configuration.banThreshold || 5,
          banDurationDays: configuration.banDurationDays || 30,
        });
      } catch (err: any) {
        console.error("Error loading configuration:", err);
        setError(
          `Failed to load configuration: ${err.message}. Using default values for now.`,
        );

        // Use default values if loading fails
        setFormData({
          postVisibilityDuration: 24,
          dailyFreePostLimit: 3,
          reportThresholds: {
            normal: 2,
            warning: 5,
            urgent: 10,
          },
          emojiPinPrice: 10,
          dailyFreeCoin: 10,
          maxActiveAnnouncements: 3,
          urgentAnnouncementThreshold: 48,
          banThreshold: 5,
          banDurationDays: 30,
        });
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();

    // Subscribe to real-time configuration changes
    const unsubscribe = subscribeToConfiguration(
      (updatedConfig) => {
        setConfig(updatedConfig);
        // Don't update form data if user is currently editing
        if (!saving) {
          setFormData({
            postVisibilityDuration: updatedConfig.postVisibilityDuration,
            dailyFreePostLimit: updatedConfig.dailyFreePostLimit,
            reportThresholds: updatedConfig.reportThresholds,
            emojiPinPrice: updatedConfig.emojiPinPrice,
            dailyFreeCoin: updatedConfig.dailyFreeCoin || 10,
            maxActiveAnnouncements: updatedConfig.maxActiveAnnouncements || 3,
            urgentAnnouncementThreshold:
              updatedConfig.urgentAnnouncementThreshold || 48,
            banThreshold: updatedConfig.banThreshold || 5,
            banDurationDays: updatedConfig.banDurationDays || 30,
          });
        }
      },
      (error) => {
        console.warn("Configuration subscription error:", error);
        // Don't set error state for subscription failures, just log them
      },
    );

    return () => unsubscribe();
  }, [saving]);

  // Handle form field updates
  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => {
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        return {
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: value,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });

    // Clear previous errors when user makes changes
    setValidationErrors([]);
    setError("");
  };

  // Handle save configuration
  const handleSaveSettings = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      setValidationErrors([]);

      // Validate configuration
      const errors = validateConfiguration(formData);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Update configuration
      const updatedConfig = await updateAdminConfiguration(formData, config);
      setConfig(updatedConfig);
      setSuccess("Configuration saved successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(
        err.message || "Failed to save configuration. Please try again.",
      );
      console.error("Error saving configuration:", err);
    } finally {
      setSaving(false);
    }
  };

  // Handle reset to defaults
  const handleResetDefaults = () => {
    if (!config) return;

    setFormData({
      postVisibilityDuration: 24,
      dailyFreePostLimit: 3,
      reportThresholds: {
        normal: 2,
        warning: 5,
        urgent: 10,
      },
      emojiPinPrice: 0.99,
      dailyFreeCoin: 10,
      maxActiveAnnouncements: 3,
      urgentAnnouncementThreshold: 48,
      banThreshold: 5,
      banDurationDays: 30,
    });
    setValidationErrors([]);
    setError("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
        <div className="flex min-h-screen p-4">
          <Sidebar />
          <main className="flex-1 p-6 min-h-full ml-4">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Loading configuration...
              </span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Configuration</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Configure application setting for the AUGo app.
              </p>
              {config && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Last updated: {new Date(config.lastUpdated).toLocaleString()}{" "}
                  by {config.updatedBy}
                </p>
              )}
            </div>
            <NotificationBell className="group" />
          </header>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-green-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-yellow-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Please fix the following errors:
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Coin System Card - Full width at top with two columns */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Coin System
                  </h3>
                  <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                    <svg
                      className="w-5 h-5 text-yellow-600 dark:text-yellow-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Daily Free Coins
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.dailyFreeCoin}
                      onChange={(e) =>
                        updateFormField("dailyFreeCoin", Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Number of coins students receive daily for free
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Emoji Pin Cost (Coins)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.emojiPinPrice}
                      onChange={(e) =>
                        updateFormField("emojiPinPrice", Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Cost of custom emoji pins
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Post Rules and Report Thresholds */}
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Post Rules Card - Combined post visibility and daily limits */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Post Rules
                    </h3>
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                      <svg
                        className="w-5 h-5 text-blue-600 dark:text-blue-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Post Visibility Duration (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={formData.postVisibilityDuration}
                        onChange={(e) =>
                          updateFormField(
                            "postVisibilityDuration",
                            Number(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Applies only to student posts, not announcements
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Daily Free Post Limit
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={formData.dailyFreePostLimit}
                        onChange={(e) =>
                          updateFormField(
                            "dailyFreePostLimit",
                            Number(e.target.value),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Maximum free posts per student per day
                      </p>
                    </div>
                  </div>
                </div>

                {/* Report Thresholds Card - Updated with flag icons */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Report Thresholds
                    </h3>
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                      <img
                        className="w-5 h-5"
                        src="/icons/reports.png"
                        alt="Flag Icon"
                        style={{
                          filter:
                            "invert(17%) sepia(100%) saturate(7500%) hue-rotate(0deg) brightness(100%) contrast(100%)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-800 dark:text-green-200 flex-1">
                        Normal
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={formData.reportThresholds.normal}
                        onChange={(e) =>
                          updateFormField("reportThresholds", {
                            ...formData.reportThresholds,
                            normal: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border border-green-300 dark:border-green-600 rounded focus:ring-green-500 focus:border-green-500 dark:bg-green-900/50 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex-1">
                        Warning
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={formData.reportThresholds.warning}
                        onChange={(e) =>
                          updateFormField("reportThresholds", {
                            ...formData.reportThresholds,
                            warning: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border border-yellow-300 dark:border-yellow-600 rounded focus:ring-yellow-500 focus:border-yellow-500 dark:bg-yellow-900/50 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 shadow-sm">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-semibold text-red-800 dark:text-red-200 flex-1">
                        Urgent Review
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={formData.reportThresholds.urgent}
                        onChange={(e) =>
                          updateFormField("reportThresholds", {
                            ...formData.reportThresholds,
                            urgent: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2 py-1 text-sm border-2 border-red-300 dark:border-red-600 rounded focus:ring-red-500 focus:border-red-500 dark:bg-red-900/50 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* User Moderation Card */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    User Moderation
                  </h3>
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                    <svg
                      className="w-5 h-5 text-red-600 dark:text-red-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Auto-Ban Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.banThreshold}
                      onChange={(e) =>
                        updateFormField("banThreshold", Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Users exceeding this warning count will be automatically
                      banned (cannot post, can only view)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ban Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.banDurationDays}
                      onChange={(e) =>
                        updateFormField(
                          "banDurationDays",
                          Number(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      How long a banned user stays suspended before they can
                      post again
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 w-full">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Auto-Ban Rule
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      When a user reaches{" "}
                      <span className="font-bold">{formData.banThreshold}</span>{" "}
                      warnings, they are automatically banned for{" "}
                      <span className="font-bold">
                        {formData.banDurationDays}
                      </span>{" "}
                      days. Banned users can still use the app but cannot create
                      posts.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Announcer Rules Card */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Announcer Rules
                  </h3>
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <svg
                      className="w-5 h-5 text-purple-600 dark:text-purple-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Active Announcements
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.maxActiveAnnouncements}
                      onChange={(e) =>
                        updateFormField(
                          "maxActiveAnnouncements",
                          Number(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum concurrent active announcements per announcer
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Urgent Announcement Threshold (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={formData.urgentAnnouncementThreshold}
                      onChange={(e) =>
                        updateFormField(
                          "urgentAnnouncementThreshold",
                          Number(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Show pending announcements in notification bell if
                      starting within this time
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Save and Reset Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleResetDefaults}
                disabled={saving}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset to Defaults
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving || validationErrors.length > 0}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Configuration</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(Configuration);
