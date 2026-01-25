import React from "react";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import UserTable from "@/components/tables/UserTable";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function Users() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Hook handles redirect
  }

  return (
    <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Search users by name or ID. Filter by status and faculty. Manage user accounts with view, warn, and ban actions.</p>
            </div>
            <NotificationBell className="group" />
          </header>

          <UserTable />
        </main>
      </div>
    </div>
  );
}
