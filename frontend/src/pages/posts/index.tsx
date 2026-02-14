import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import PostTable from "@/components/tables/PostTable";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";

function Posts() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Handle query parameters
  useEffect(() => {
    const { id } = router.query;
    
    if (id && typeof id === 'string') {
      setSearchTerm(id);
    }
  }, [router.query]);

  return (
    <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Post Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Search and filter posts by location, category, and status. Sort by engagement metrics.</p>
            </div>
            <NotificationBell className="group" />
          </header>

          <PostTable initialSearchTerm={searchTerm} />
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(Posts);
