import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from '@/lib/auth/validate-session'
import "./page.css";

export const metadata: Metadata = {
  title: 'Hoot - Learn More',
}

export default async function LearnMore() {
  const user = await getSessionUser()

  return (
    <div className="learn-more-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link href={user ? "/dashboard" : "/"} className="logo-link">
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
            {user ? (
              <Link href="/dashboard" className="nav-button">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Sign In
                </Link>
                <Link href="/signup" className="nav-button">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="learn-hero">
        <div className="section-container">
          <h1 className="page-title">Learn More About <span className="gold-text">Hoot</span></h1>
          
          <div className="content-grid">
            <div className="content-card">
              <div className="card-icon">
                <span className="material-icons">rocket_launch</span>
              </div>
              <h2 className="card-title">Getting Started</h2>
              <p className="card-text">
                Sign up for an account and purchase credits—these credits are your currency for creating TikTok Business Centers. You can create up to 100 Business Centers at once, with a maximum of 100 business center requests per hour, giving you the flexibility to scale at your own pace.
              </p>
            </div>

            <div className="content-card">
              <div className="card-icon">
                <span className="material-icons">verified</span>
              </div>
              <h2 className="card-title">100% Delivery Guarantee</h2>
              <p className="card-text">
                Credits are only deducted from your account after the Business Center login credentials are successfully delivered to your account vault. If a creation fails for any reason, your credits are automatically refunded—no questions asked, no manual intervention needed.
              </p>
            </div>

            <div className="content-card">
              <div className="card-icon">
                <span className="material-icons">account_balance</span>
              </div>
              <h2 className="card-title">Your Vault</h2>
              <p className="card-text">
                Once your Business Centers are created, they're securely stored in your vault, ready whenever you need them. Simply navigate to your vault to access all your Business Centers and their credentials.
              </p>
            </div>

            <div className="content-card">
              <div className="card-icon">
                <span className="material-icons">security</span>
              </div>
              <h2 className="card-title">Verification Codes</h2>
              <p className="card-text">
                Need a verification code? You can fetch it directly from the same interface with a single click. Verification codes can also be retrieved here for closing accounts, managing your Business Centers, or any other administrative tasks you need to perform.
              </p>
            </div>
          </div>

          <div className="cta-buttons">
            <Link href="/signup" className="cta-button primary">
              Get Started
            </Link>
            <Link href="/contact" className="cta-button secondary">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
