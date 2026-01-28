import React from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import AnnouncerTable from "@/components/tables/AnnouncerTable";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";

function Announcers() {
  const router = useRouter();

  const handleAddAnnouncer = () => {
    router.push('/announcers/add');
  };

  return (
    <div className="min-h-screen bg-purple-50/30 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <div className="flex items-center justify-between mb-8">
            <header>
              <h1 className="text-3xl font-bold">Announcers Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Create, edit, and manage announcers with full search and filter capabilities</p>
            </header>
            <button
              onClick={handleAddAnnouncer}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Announcer</span>
            </button>
          </div>

          <AnnouncerTable />
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(Announcers);
