import Link from "next/link";
import "./page.css";

export default function Home() {
  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Automate Your <span className="gold-text">TikTok</span> Growth
            </h1>
            <p className="hero-subtitle">
              Powerful automation tools to help you scale, engage, and dominate TikTok.
              Schedule posts, manage interactions, and grow your audience effortlessly.
            </p>
            <div className="hero-buttons">
              <Link href="/signup" className="btn-gold">
                <span className="material-icons">rocket_launch</span>
                Get Started Free
              </Link>
              <Link href="/login" className="btn-outline">
                <span className="material-icons">login</span>
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">schedule</span>
              </div>
              <h3 className="feature-title">Smart Scheduling</h3>
              <p className="feature-text">
                Plan and schedule your TikTok content in advance. Never miss the perfect posting time.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">auto_awesome</span>
              </div>
              <h3 className="feature-title">AI-Powered</h3>
              <p className="feature-text">
                Leverage artificial intelligence to optimize your content strategy and engagement.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">trending_up</span>
              </div>
              <h3 className="feature-title">Analytics Dashboard</h3>
              <p className="feature-text">
                Track your growth with detailed analytics and insights into your TikTok performance.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">groups</span>
              </div>
              <h3 className="feature-title">Audience Management</h3>
              <p className="feature-text">
                Manage interactions, respond to comments, and build meaningful connections with your audience.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">security</span>
              </div>
              <h3 className="feature-title">Secure & Safe</h3>
              <p className="feature-text">
                Built with security in mind. Your account and data are protected with enterprise-grade encryption.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <span className="material-icons">speed</span>
              </div>
              <h3 className="feature-title">Lightning Fast</h3>
              <p className="feature-text">
                Experience blazing-fast performance. Get things done in seconds, not minutes.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your TikTok?</h2>
            <p className="cta-text">
              Join thousands of creators who are already automating their success.
            </p>
            <Link href="/signup" className="btn-gold-large">
              <span className="material-icons">play_arrow</span>
              Start Your Journey
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}