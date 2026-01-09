import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from "next/link";
import Image from "next/image";
import "../styles/base.css";
import "./page.css";

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          <Link href="/" className="logo-link">
            <Image
              src="/hootlogo.png"
              alt="Hoot Logo"
              width={180}
              height={60}
              priority
              className="logo"
            />
          </Link>
          
          <nav className="header-nav">
            <div className="user-info">
              <span className="user-email">{user.email}</span>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="nav-button logout-button">
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      {/* Dashboard Content */}
      <section className="dashboard-content">
        <div className="dashboard-container">
          <h1 className="dashboard-title">Welcome to <span className="gold-text">Hoot</span></h1>
          <p className="dashboard-subtitle">Your automation dashboard is ready. Let's get started!</p>
          
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <span className="material-icons">account_balance</span>
              </div>
              <div className="stat-value">0</div>
              <div className="stat-label">Business Centers</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <span className="material-icons">account_balance_wallet</span>
              </div>
              <div className="stat-value">0</div>
              <div className="stat-label">Credits</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <span className="material-icons">add_circle</span>
              </div>
              <div className="stat-value">0</div>
              <div className="stat-label">Total Created</div>
            </div>
          </div>

          <div className="dashboard-actions">
            <button className="action-button primary">
              <span className="material-icons">add_circle</span>
              Create Business Centers
            </button>
            <button className="action-button secondary">
              <span className="material-icons">account_balance_wallet</span>
              Purchase Credits
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
