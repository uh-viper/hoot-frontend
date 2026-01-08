import Link from "next/link";
import Image from "next/image";
import "./page.css";

export default function Home() {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link href="/" className="logo-link">
            <Image
              src="/hootlogo.png"
              alt="Hoot Logo"
              width={240}
              height={80}
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
      <div className="landing-container">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Automation, <span className="gold-text">Simplified.</span>
            </h1>
            <p className="hero-subtitle">
              Powerful automation tools to help you scale, engage, and dominate TikTok.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}