import React from "react";
import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import MetricCard from "@/components/dashboard/MetricCard";
import UserActivityChart from "@/components/dashboard/UserActivityChart";
import PostCategoriesChart from "@/components/dashboard/PostCategoriesChart";
import TopLocationsChart from "@/components/dashboard/TopLocationsChart";
import TopPostsList from "@/components/dashboard/TopPostsList";
import RecentReportsList from "@/components/dashboard/RecentReportsList";
import PendingAnnouncementApprovals from "@/components/dashboard/PendingAnnouncementApprovals";
import PendingAnnouncerApprovals from "@/components/dashboard/PendingAnnouncerApprovals";
import { Icons } from "@/utils/icons";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";

function Home() {

  return (
    <>
      <Head>
        <title>AUGo Admin Dashboard</title>
        <meta name="description" content="AUGo Administration Dashboard" />
      </Head>
      <div className="min-h-screen bg-purple-50/40 dark:bg-black text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen p-4">
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 p-6 min-h-full ml-4">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Dashboard Overview</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">Welcome back! Here's what's happening with AUGo today.</p>
            </div>
            <NotificationBell className="group" />
          </header>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard 
              title="Active Users" 
              value="2,847" 
              icon={<img src={Icons.users} alt="Users" className="w-6 h-6" />} 
              color="purple"
              description="↑ 12% from last month"
            />
            <MetricCard 
              title="Total Posts" 
              value="12,453" 
              icon={<img src={Icons.posts} alt="Posts" className="w-6 h-6" />} 
              color="blue"
              description="↑ 8% from last month"
            />
            <MetricCard 
              title="Pending Reports" 
              value="23" 
              icon={<img src={Icons.reports} alt="Reports" className="w-6 h-6" />} 
              color="orange"
              description="Needs attention"
            />
            <MetricCard 
              title="Active Announcements" 
              value="8" 
              icon={<img src={Icons.announcements} alt="Announcements" className="w-6 h-6" />} 
              color="green"
              description="Currently live"
            />
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <UserActivityChart />
            <PendingAnnouncerApprovals />
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <TopLocationsChart />
            <PostCategoriesChart />
            <TopPostsList />
          </div>

          {/* Reports and Approvals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentReportsList />
            <PendingAnnouncementApprovals />
          </div>
        </main>

      </div>
      </div>
    </>
  );
}

export default withAdminAuth(Home);
