"use client";

import Link from "next/link";
import Image from "next/image";
import "../../styles/base.css";
import "../../styles/responsive.css";
import "./page.css";

export default function CheckEmail() {
  return (
    <div className="check-email-page">
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

      {/* Check Email Section */}
      <section className="check-email-section">
        <div className="check-email-container">
          <div className="check-email-card">
            <div className="check-email-icon-wrapper">
              <span className="material-icons">mail_outline</span>
            </div>
            <h1 className="check-email-title">Check Your <span className="gold-text">Email</span></h1>
            <p className="check-email-message">
              We've sent a confirmation link to your email address. Please click the link to verify your account and complete your registration.
            </p>
            <div className="check-email-info">
              <div className="info-item">
                <span className="material-icons">info_outline</span>
                <span>Check your spam folder if you don't see the email</span>
              </div>
              <div className="info-item">
                <span className="material-icons">schedule</span>
                <span>The link will expire in 24 hours</span>
              </div>
            </div>
            <div className="check-email-actions">
              <Link href="/login" className="check-email-button">
                <span className="material-icons">login</span>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
