"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "../../actions/auth";
import { createClient } from "@/lib/supabase/client";
import "../../styles/dashboard.css";

interface SidebarProps {
  userEmail?: string;
  credits?: number;
  isAdmin?: boolean;
}

export default function Sidebar({ userEmail, credits: initialCredits = 0, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [credits, setCredits] = useState(initialCredits);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Fetch credits client-side and subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const fetchCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (creditsData) {
        setCredits(creditsData.credits ?? 0);
      }
    };
    
    const setupCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch initial credits
      await fetchCredits();

      // Subscribe to real-time updates for user_credits table
      channel = supabase
        .channel(`user-credits-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_credits',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Update credits when database changes
            if (payload.new && 'credits' in payload.new) {
              setCredits(payload.new.credits as number);
            }
          }
        )
        .subscribe();
    };

    setupCredits();

    // Listen for custom event to refresh credits (triggered when job completes)
    const handleCreditsUpdate = () => {
      fetchCredits();
    };
    
    window.addEventListener('credits-updated', handleCreditsUpdate);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('credits-updated', handleCreditsUpdate);
    };
  }, []);

  // Also refresh when navigating to a new page
  useEffect(() => {
    const supabase = createClient();
    const fetchCredits = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (creditsData) {
        setCredits(creditsData.credits ?? 0);
      }
    };
    fetchCredits();
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
    // Add admin link before settings if user is admin
    ...(isAdmin ? [{
      icon: "admin_panel_settings",
      label: "Admin",
      path: "/dashboard/admin",
    }] : []),
    {
      icon: "settings",
      label: "Settings",
      path: "/dashboard/settings",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    <>
      <button 
        className="sidebar-mobile-toggle"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
      </button>
      
      {isMobileMenuOpen && (
        <div className="sidebar-overlay active" onClick={closeMobileMenu} />
      )}

      <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <button 
            className="sidebar-close-button"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <span className="material-icons">close</span>
          </button>
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
    </>
  );
}
