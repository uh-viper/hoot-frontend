import Link from "next/link";
import Image from "next/image";
import "../styles/base.css";
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
          <p className="page-subtitle">
            Everything you need to know about our TikTok Business Center automation platform.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="learn-content">
        <div className="section-container">
          <div className="content-section">
            <h2 className="content-title">What is Hoot?</h2>
            <p className="content-text">
              Hoot is a powerful automation platform designed specifically for TikTok advertisers who need to scale their operations rapidly. 
              We eliminate the tedious, time-consuming manual process of creating TikTok Business Centers, allowing you to deploy multiple 
              BCs in minutes instead of hours.
            </p>
          </div>

          <div className="content-section">
            <h2 className="content-title">How It Works</h2>
            <div className="feature-list">
              <div className="feature-item">
                <span className="material-icons">rocket_launch</span>
                <div>
                  <h3 className="feature-item-title">Mass Creation</h3>
                  <p className="feature-item-text">
                    Deploy as many Business Centers as you need with a single click. No more spending 10+ minutes on each BC setup.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <span className="material-icons">shield</span>
                <div>
                  <h3 className="feature-item-title">Anti-Fingerprint Technology</h3>
                  <p className="feature-item-text">
                    Each BC is generated with unique parameters to ensure maximum longevity and reduced linkage between accounts.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <span className="material-icons">api</span>
                <div>
                  <h3 className="feature-item-title">Seamless Integration</h3>
                  <p className="feature-item-text">
                    Our business centers integrate directly into your workflow, so you never have to see TikTok until it's time to run ads.
                  </p>
                </div>
              </div>
              <div className="feature-item">
                <span className="material-icons">timer</span>
                <div>
                  <h3 className="feature-item-title">5 Minute Guarantee</h3>
                  <p className="feature-item-text">
                    From deploying the automation to signing in, faster than you can make a cup of coffee.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="content-section">
            <h2 className="content-title">Why Choose Hoot?</h2>
            <p className="content-text">
              In the time it took your competitor to set up one ad account, you just deployed ten Business Centers. 
              Speed matters in advertising, and Hoot gives you the competitive edge you need to scale faster than ever before.
            </p>
            <div className="benefits-grid">
              <div className="benefit-card">
                <div className="benefit-number">10x</div>
                <div className="benefit-label">Faster Setup</div>
              </div>
              <div className="benefit-card">
                <div className="benefit-number">100+</div>
                <div className="benefit-label">BCs Per Minute</div>
              </div>
              <div className="benefit-card">
                <div className="benefit-number">∞</div>
                <div className="benefit-label">No Limits</div>
              </div>
            </div>
          </div>

          <div className="content-section">
            <h2 className="content-title">Get Started</h2>
            <p className="content-text">
              Ready to revolutionize your TikTok advertising workflow? Join thousands of affiliates who trust Hoot for their 
              Business Center automation needs.
            </p>
            <div className="cta-buttons">
              <Link href="/signup" className="cta-button primary">
                Start Now
              </Link>
              <Link href="/contact" className="cta-button secondary">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
