import Link from "next/link";
import Image from "next/image";
import Footer from "../components/Footer";
import "../styles/base.css";
import "../styles/footer.css";
import "./page.css";

export default function LearnMore() {
  return (
    <div className="learn-more-page">
      {/* Header */}
      <header className="header">
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
            <Link href="/login" className="nav-link">
              Sign In
            </Link>
            <Link href="/signup" className="nav-button">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="learn-hero">
        <div className="section-container">
          <h1 className="page-title">Learn More About <span className="gold-text">Hoot</span></h1>
          <div className="main-content-text">
            <p>
              Getting started with Hoot is simple and straightforward. First, you'll sign up for an account and purchase credits—these credits are your currency for creating TikTok Business Centers. You can create up to 25 Business Centers at once, with a maximum of 50 per day, giving you the flexibility to scale at your own pace. Once credits are purchased, they are non-refundable, but here's what sets us apart: we guarantee 100% delivery. This means credits are only deducted from your account after the Business Center login credentials are successfully delivered to your account vault. If a creation fails for any reason, your credits are automatically refunded—no questions asked, no manual intervention needed. Once your Business Centers are created, they're securely stored in your vault, ready whenever you need them. To access a Business Center, simply navigate to your vault, select the Business Center you want to use, and click "Log In"—you'll be provided with the email and password for that account. Need a verification code? You can fetch it directly from the same interface with a single click. Verification codes can also be retrieved here for closing accounts, managing your Business Centers, or any other administrative tasks you need to perform. Hoot eliminates the guesswork, the manual labor, and the time waste—everything you need is in one place, accessible in seconds.
            </p>
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
