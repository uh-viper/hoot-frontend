"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "../../actions/auth";
import "../../styles/dashboard.css";

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      icon: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: "account_balance",
      label: "Vault",
      path: "/dashboard/vault",
    },
    {
      icon: "payment",
      label: "Credits",
      path: "/dashboard/credits",
    },
    {
      icon: "history",
      label: "Activity",
      path: "/dashboard/activity",
    },
    {
      icon: "settings",
      label: "Settings",
      path: "/dashboard/settings",
    },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-logo">Hoot</h2>
        <p className="sidebar-tagline">Automation Starts Here</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <span className="material-icons">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <span className="material-icons">account_circle</span>
          <span className="sidebar-user-email">{userEmail || "User"}</span>
        </div>
        <form action={signOut}>
          <button type="submit" className="sidebar-signout">
            <span className="material-icons">logout</span>
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
