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
        <div className="hero-particles">
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
          <div className="hero-particle"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">Stop Waiting.</span>
            <span className="title-line gold-text">Start Scaling.</span>
          </h1>
          <p className="hero-subtitle">
            Any region, any currency. As many business centers as you need. Fully autonomous.
          </p>
          <p className="hero-bcs-note">BCS ARE MADE WITH OUTLOOK EMAILS</p>
          <div className="hero-cta-group">
            <Link href="/signup" className="hero-cta primary" prefetch={false}>
              Start Now
            </Link>
            <Link href="/learn-more" className="hero-cta secondary">
              Learn More
            </Link>
          </div>
          <div className="hero-video-barrier" />
          <div className="hero-video-line" />
          <div className="hero-video-section">
            <h2 className="hero-video-title">How it Works</h2>
            <div className="hero-video-embed">
              <iframe
                src="https://www.youtube.com/embed/-juSWLRAII4"
                title="How it Works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}