import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/validate-session'
import EmailCodeHandler from "./components/EmailCodeHandler";
import "./styles/hero.css";

export const metadata: Metadata = {
  title: 'Hoot - Automation Starts Here',
}

export default async function Home() {
  // Redirect authenticated users to dashboard (similar to login page)
  const user = await getSessionUser()
  if (user) {
    redirect('/dashboard')
  }
  return (
    <div className="landing-page">
      <EmailCodeHandler />
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
            <Link href="/login" className="nav-link" prefetch={false}>
              Sign In
            </Link>
            <Link href="/signup" className="nav-button" prefetch={false}>
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">Stop Waiting.</span>
            <span className="title-line gold-text">Start Scaling.</span>
          </h1>
          <p className="hero-subtitle">
            Generate as many TikTok Business Centers as you need. Any region, any currency. 
            No manual setup, no delays. Built for advertisers who can't afford to be slowed down.
          </p>
          <div className="hero-cta-group">
            <Link href="/signup" className="hero-cta primary" prefetch={false}>
              Start Now
            </Link>
            <Link href="/learn-more" className="hero-cta secondary">
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}