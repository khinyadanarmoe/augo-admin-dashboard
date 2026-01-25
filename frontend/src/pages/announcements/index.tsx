import React from "react";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import AnnouncementTable from "@/components/tables/AnnouncementTable";

export default function Announcements() {
  return (
    <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Announcement Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Manage announcement history with filters by date, faculty, location, and content topic. Track views and status.</p>
            </div>
            <NotificationBell className="group" />
          </header>

          <AnnouncementTable />
        </main>
      </div>
    </div>
  );
}
