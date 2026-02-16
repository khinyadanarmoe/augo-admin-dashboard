import React from "react";
import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";
import MetricCard from "@/components/dashboard/MetricCard";
import PostsOverTimeChart from "@/components/dashboard/PostsOverTimeChart";
import PostCategoriesChart from "@/components/dashboard/PostCategoriesChart";
import TopPostsList from "@/components/dashboard/TopPostsList";
import RecentReportsList from "@/components/dashboard/RecentReportsList";
import PendingAnnouncementApprovals from "@/components/dashboard/PendingAnnouncementApprovals";
import RecentFlaggedUsers from "@/components/dashboard/RecentFlaggedUsers";
import { Icons } from "@/utils/icons";
import { withAdminAuth } from "@/components/hoc/withAdminAuth";
import { useDashboard } from "@/hooks/useDashboard";

function Home() {
  const { data, loading, error, timeRange, changeTimeRange } = useDashboard();

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50/40 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-purple-50/40 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  Welcome back! Here's what's happening with AUGo today.
                </p>
              </div>
              <NotificationBell className="group" />
            </header>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Active Users"
                value={(data?.metrics.activeUsers || 0).toLocaleString()}
                icon={<img src={Icons.users} alt="Users" className="w-6 h-6" />}
                color="purple"
                description="Currently active"
              />
              <MetricCard
                title="Total Posts"
                value={(data?.metrics.totalPosts || 0).toLocaleString()}
                icon={<img src={Icons.posts} alt="Posts" className="w-6 h-6" />}
                color="blue"
                description="All time posts"
              />
              <MetricCard
                title="Pending Reports"
                value={(data?.metrics.pendingReports || 0).toLocaleString()}
                icon={
                  <img src={Icons.reports} alt="Reports" className="w-6 h-6" />
                }
                color="orange"
                description="Needs attention"
              />
              <MetricCard
                title="Pending Announcements"
                value={(
                  data?.metrics.pendingAnnouncements || 0
                ).toLocaleString()}
                icon={
                  <img
                    src={Icons.announcements}
                    alt="Announcements"
                    className="w-6 h-6"
                  />
                }
                color="green"
                description="Awaiting approval"
              />
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <PostsOverTimeChart
                data={data?.postsOverTime}
                timeRange={timeRange}
                onTimeRangeChange={changeTimeRange}
              />
              <PendingAnnouncementApprovals
                announcements={data?.pendingAnnouncements}
              />
            </div>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <PostCategoriesChart data={data?.postCategories} />
              <TopPostsList posts={data?.topPosts} />
            </div>

            {/* Reports and User Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentFlaggedUsers users={data?.recentFlaggedUsers} />
              <RecentReportsList reports={data?.recentReports} />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default withAdminAuth(Home);
