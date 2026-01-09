"use client";

import Link from "next/link";
import Image from "next/image";

export default function LoginFallback() {
  return (
    <div className="auth-page">
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
            <Link href="/login" className="nav-link">Sign In</Link>
            <Link href="/signup" className="nav-button">Sign Up</Link>
          </nav>
        </div>
      </header>
      <section className="auth-section">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Sign <span className="gold-text">In</span></h1>
            <p className="auth-subtitle">Welcome back to Hoot</p>
          </div>
        </div>
      </section>
    </div>
  );
}
