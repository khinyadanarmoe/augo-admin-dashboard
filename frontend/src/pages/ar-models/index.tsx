import React, { useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import ARModelsTable from "@/components/tables/ARModelsTable";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";

function ARModels() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleAddNew = () => {
    router.push("/ar-models/add");
  };

  return (
    <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">AR Models Management</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Upload and manage 3D AR models.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Add New Model</span>
              </button>
              <NotificationBell className="group" />
            </div>
          </header>

          <ARModelsTable initialSearchTerm={searchTerm} />
        </main>
      </div>
    </div>
  );
}

export default withAdminAuth(ARModels);
