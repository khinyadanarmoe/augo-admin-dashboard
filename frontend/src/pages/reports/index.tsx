import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import ReportTable from "@/components/tables/ReportTable";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";

function Reports() {
  const router = useRouter();
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Handle query parameters from notification bell
  useEffect(() => {
    const { filterBy, postId, highlight, autoScroll, id } = router.query;

    // Handle both old format (filterBy + postId) and new format (id)
    if (id && typeof id === "string") {
      setSearchTerm(id);
      setHighlightPostId(id);
    } else if (filterBy === "postId" && postId && typeof postId === "string") {
      // Set search term to the postId
      setSearchTerm(postId);
    }

    if (highlight && typeof highlight === "string") {
      // Highlight the specific post
      setHighlightPostId(highlight);
    }

    if (autoScroll === "true" && (highlight || id)) {
      // Scroll to the highlighted post after a brief delay
      const scrollId = highlight || id;
      setTimeout(() => {
        const element = document.getElementById(`report-${scrollId}`);
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
        <main className="flex-1  p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Report Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Manage user reports by severity. High severity reports (threats,
                nudity, hate speech, scam) auto-remove posts. Track harassment,
                impersonation, misinformation, spam, and other violations.
              </p>
            </div>
            <NotificationBell className="group" />
          </header>

          <ReportTable
            highlightPostId={highlightPostId}
            initialSearchTerm={searchTerm}
          />
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(Reports);
