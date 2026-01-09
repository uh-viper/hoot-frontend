"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "../../actions/auth";
import "../../styles/dashboard.css";

interface SidebarProps {
  userEmail?: string;
  credits?: number;
}

export default function Sidebar({ userEmail, credits = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const menuItems = [
    {
      icon: "dashboard",
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: "build",
      label: "Creation",
      path: "/dashboard/creation",
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
      icon: "settings",
      label: "Settings",
      path: "/dashboard/settings",
    },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-logo">Hoot Services</h2>
        <p className="sidebar-tagline">Automation Starts Here</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              prefetch={true}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => setIsNavigating(true)}
            >
              <span className="material-icons">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-credits">
          <span className="material-icons">payment</span>
          <span className="credits-text">{credits.toLocaleString()}</span>
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
