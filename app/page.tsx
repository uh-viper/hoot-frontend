import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import Footer from "./components/Footer";
import EmailCodeHandler from "./components/EmailCodeHandler";
import "./styles/base.css";
import "./styles/hero.css";
import "./styles/comparison.css";
import "./styles/features.css";
import "./styles/workflow.css";
import "./styles/why.css";
import "./styles/social-proof.css";
import "./styles/cta.css";
import "./styles/footer.css";
import "./styles/responsive.css";

export const metadata: Metadata = {
  title: 'Hoot - Home',
}

export default function Home() {
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

      {/* The Problem Section */}
      <section className="problem-section">
        <div className="section-container">
          <h2 className="section-title">The Old Way vs. <span className="gold-text">Our Way</span></h2>
          <div className="comparison-table">
            <div className="comparison-header">
              <div className="comparison-col old-way">
                <span className="material-icons">hourglass_empty</span>
                The Old Way
              </div>
              <div className="comparison-col hoot-way">
                <span className="material-icons">flash_on</span>
                Our Way
              </div>
            </div>
            <div className="comparison-row">
              <div className="comparison-col old-way">
                <span className="material-icons">schedule</span>
                Takes 10+ Minutes to Make one BC
              </div>
              <div className="comparison-col hoot-way">
                <span className="material-icons">bolt</span>
                Deploy multiple BCs in minutes
              </div>
            </div>
            <div className="comparison-row">
              <div className="comparison-col old-way">
                <span className="material-icons">warning</span>
                Risk of fingerprint & bans/disapprovals
              </div>
              <div className="comparison-col hoot-way">
                <span className="material-icons">verified</span>
                Clean, isolated BC generation
              </div>
            </div>
            <div className="comparison-row">
              <div className="comparison-col old-way">
                <span className="material-icons">speed</span>
                Limited by human speed
              </div>
              <div className="comparison-col hoot-way">
                <span className="material-icons">rocket_launch</span>
                Scales to 100+ BCs instantly
              </div>
            </div>
            <div className="comparison-row">
              <div className="comparison-col old-way">
                <span className="material-icons">attach_money</span>
                Expensive to delegate
              </div>
              <div className="comparison-col hoot-way">
                <span className="material-icons">savings</span>
                Cost-effective automation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Octane Features */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">Our <span className="gold-text">Features</span></h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="material-icons">flash_on</span>
              </div>
              <h3 className="feature-name">Mass Creation</h3>
              <p className="feature-desc">
                Why spend 10 minutes setting up one business center when you can click a button and have 50 in your hands within 3 minutes?
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="material-icons">shield</span>
              </div>
              <h3 className="feature-name">Anti-Fingerprint Architecture</h3>
              <p className="feature-desc">
                Each BC is generated with unique parameters to ensure maximum longevity and reduced linkage.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="material-icons">api</span>
              </div>
              <h3 className="feature-name">Create and forget</h3>
              <p className="feature-desc">
                Our business centers integrate directly into your workflow, so you never have to see TikTok until it's time to run ads.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="material-icons">timer</span>
              </div>
              <h3 className="feature-name">The 5 Minute Guarantee</h3>
              <p className="feature-desc">
                From deploying the automation to signing in, faster than you can make a cup of coffee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="section-title">How <span className="gold-text">It Works</span></h2>
          <div className="workflow-grid">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <div className="step-icon-wrapper">
                <span className="material-icons">add_circle</span>
              </div>
              <h3 className="step-title">Generate BC</h3>
              <p className="step-desc">
                Deploy as many Business Centers as you need. Any region, any currency.
              </p>
            </div>
            <div className="workflow-connector"></div>
            <div className="workflow-step">
              <div className="step-number">2</div>
              <div className="step-icon-wrapper">
                <span className="material-icons">account_balance</span>
              </div>
              <h3 className="step-title">Stored in Vault</h3>
              <p className="step-desc">
                Each BC sits securely in your account vault, ready to use when needed.
              </p>
            </div>
            <div className="workflow-connector"></div>
            <div className="workflow-step">
              <div className="step-number">3</div>
              <div className="step-icon-wrapper">
                <span className="material-icons">dashboard</span>
              </div>
              <h3 className="step-title">Sign In & Manage</h3>
              <p className="step-desc">
                Access via dashboard. Get verification codes, close BCs, and manage everything from one place.
              </p>
            </div>
            <div className="workflow-connector"></div>
            <div className="workflow-step">
              <div className="step-number">4</div>
              <div className="step-icon-wrapper">
                <span className="material-icons">support_agent</span>
              </div>
              <h3 className="step-title">VA Support & Integration</h3>
              <p className="step-desc">
                We offer VA support and integration to create VA sub-accounts seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="why-section">
        <div className="section-container">
          <h2 className="section-title">Why It <span className="gold-text">Matters</span></h2>
          <div className="why-content">
            <p className="why-text">
              In the time it took your competitor to set up one ad account, you just deployed ten. 
              Who do you think wins the auction?
            </p>
            <div className="why-stats">
              <div className="stat-item">
                <div className="stat-number">10x</div>
                <div className="stat-label">Faster Setup</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100+</div>
                <div className="stat-label">BCs Per Minute</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">∞</div>
                <div className="stat-label">No Limits</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="social-proof-section">
        <div className="section-container">
          <h2 className="section-title">Trusted by <span className="gold-text">Industry Leaders</span></h2>
          <div className="proof-grid">
            <div className="proof-item">
              <div className="proof-icon">
                <span className="material-icons">groups</span>
              </div>
              <h3 className="proof-title">Top-Tier TikTok Affiliates</h3>
              <p className="proof-desc">Trusted by leading affiliates worldwide</p>
            </div>
            <div className="proof-item">
              <div className="proof-icon">
                <span className="material-icons">attach_money</span>
              </div>
              <h3 className="proof-title">$1M+ Monthly Ad Spend</h3>
              <p className="proof-desc">Powering massive advertising operations</p>
            </div>
            <div className="proof-item">
              <div className="proof-icon">
                <span className="material-icons">check_circle</span>
              </div>
              <h3 className="proof-title">99.9% Success Rate</h3>
              <p className="proof-desc">Reliable account creation every time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="section-container">
          <h2 className="cta-title">Ready to Scale at <span className="gold-text">Light Speed?</span></h2>
          <p className="cta-subtitle">
            Join other affiliates that refuse to be slowed down by manual processes.
          </p>
          <div className="hero-cta-group">
            <Link href="/signup" className="hero-cta large primary" prefetch={false}>
              Start Now
            </Link>
            <Link href="/learn-more" className="hero-cta large secondary" prefetch={false}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}