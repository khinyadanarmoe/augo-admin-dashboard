import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import AnnouncementTable from "@/components/tables/AnnouncementTable";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";

function Announcements() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [highlightAnnouncementId, setHighlightAnnouncementId] = useState<
    string | null
  >(null);

  // Handle query parameters
  useEffect(() => {
    const { id, highlight, autoScroll } = router.query;

    if (id && typeof id === "string") {
      setSearchTerm(id);
      setHighlightAnnouncementId(id);
    }

    if (highlight && typeof highlight === "string") {
      setHighlightAnnouncementId(highlight);
    }

    if (autoScroll === "true" && (highlight || id)) {
      // Scroll to the highlighted announcement after a brief delay
      const scrollId = (highlight || id) as string;
      setTimeout(() => {
        const element = document.getElementById(`announcement-${scrollId}`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 1000); // Give time for table to render
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
              <h1 className="text-3xl font-bold">Announcement Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Manage announcement history with filters by date, faculty, and
                content topic. Track likes/dislikes and status.
              </p>
            </div>
            <NotificationBell className="group" />
          </header>

          <AnnouncementTable
            initialSearchTerm={searchTerm}
            highlightAnnouncementId={highlightAnnouncementId}
          />
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(Announcements);
