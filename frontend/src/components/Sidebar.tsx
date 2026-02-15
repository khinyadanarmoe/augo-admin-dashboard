import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Icons } from "../utils/icons";

export default function Sidebar() {
  const router = useRouter();
  
  const navItems = [
    { 
      href: "/", 
      label: "Dashboard", 
      icon: Icons.dashboard
    },
    { 
      href: "/posts", 
      label: "Post Management", 
      icon: Icons.posts
    },
    { 
      href: "/users", 
      label: "User Management", 
      icon: Icons.users
    },
    { 
      href: "/reports", 
      label: "Reports", 
      icon: Icons.reports
    },
    { 
      href: "/announcements", 
      label: "Announcements", 
      icon: Icons.announcements
    },
    { 
      href: "/announcers", 
      label: "Announcers", 
      icon: Icons.announcers
    },
    { 
      href: "/ar-models", 
      label: "AR Models", 
      icon: Icons.arModels
    },
    { 
      href: "/configuration", 
      label: "Configuration", 
      icon: Icons.settings
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
      <div className="flex items-center gap-3 p-6">
        <img  src="/icons/logo.png" alt="AUGO" className="w-10 h-10"/>
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Admin Panel</div>
        </div>
      </div>

      <nav className="mt-2 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg  font-medium transition-all duration-200 ${
              isActive(item.href)
                ? "bg-purple-500 text-white shadow-md"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <img 
              src={item.icon} 
              alt={item.label}
              className={
                isActive(item.href) ? "w-5 h-5 filter brightness-0 invert" : "w-5 h-5"
              }
            />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
