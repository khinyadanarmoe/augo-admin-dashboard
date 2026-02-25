import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icons } from "../utils/icons";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function Sidebar() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Use replace to clear the history and prevent back navigation
      router.replace("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      // Force redirect even if there's an error
      router.replace("/login");
    }
  };

  const navSections = [
    {
      title: "MAIN",
      items: [
        {
          href: "/",
          label: "Dashboard",
          icon: Icons.dashboard,
        },
      ],
    },
    {
      title: "CONTENT",
      items: [
        {
          href: "/posts",
          label: "Posts",
          icon: Icons.posts,
        },
        {
          href: "/announcements",
          label: "Announcements",
          icon: Icons.announcements,
        },
        {
          href: "/ar-models",
          label: "AR Models",
          icon: Icons.arModels,
        },
      ],
    },
    {
      title: "MODERATION",
      items: [
        {
          href: "/reports",
          label: "Reports",
          icon: Icons.reports,
        },
      ],
    },
    {
      title: "USERS",
      items: [
        {
          href: "/users",
          label: "User Management",
          icon: Icons.users,
        },
        {
          href: "/announcers",
          label: "Announcer Management",
          icon: Icons.announcers,
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          href: "/configuration",
          label: "Configuration",
          icon: Icons.settings,
        },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return router.pathname === "/";
    }
    return router.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-gray-900 shadow-md rounded-lg">
      <div className="flex items-center gap-3 p-6 pb-4">
        <img src="/icons/logo.png" alt="AUGO" className="w-10 h-10" />
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            Admin Panel
          </div>
        </div>
      </div>

      {/* Divisor below logo */}
      <div className="border-t border-gray-200 dark:border-gray-700 mx-4"></div>

      <nav className="mt-2 px-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-purple-500 text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <img
                    src={item.icon}
                    alt={item.label}
                    className={
                      isActive(item.href)
                        ? "w-5 h-5 filter brightness-0 invert"
                        : "w-5 h-5 dark:filter dark:brightness-0 dark:invert"
                    }
                  />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Divisor */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1.5"></div>

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Logout</span>
        </button>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Confirm Logout
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Are you sure you want to logout?
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    handleLogout();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
