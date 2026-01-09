import Link from "next/link";
import Image from "next/image";
import "../styles/base.css";
import "../styles/footer.css";
import "./page.css";

export default function Contact() {
  return (
    <div className="contact-page">
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
      <section className="contact-hero">
        <div className="section-container">
          <h1 className="page-title">Get in <span className="gold-text">Touch</span></h1>
          <p className="page-subtitle">
            Have questions? We're here to help. Reach out to our team through any of the channels below.
          </p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="contact-content">
        <div className="section-container">
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">
                <span className="material-icons">discord</span>
              </div>
              <h2 className="contact-card-title">Discord</h2>
              <p className="contact-card-text">
                Join our Discord community for real-time support, updates, and to connect with other users.
              </p>
              <a 
                href="https://discord.gg/6xEjW6SYxj" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="contact-button"
              >
                Join Discord
                <span className="material-icons">arrow_forward</span>
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">
                <span className="material-icons">email</span>
              </div>
              <h2 className="contact-card-title">Email</h2>
              <p className="contact-card-text">
                Send us an email for business inquiries, partnerships, or general questions.
              </p>
              <a 
                href="mailto:support@hoot.com" 
                className="contact-button"
              >
                Send Email
                <span className="material-icons">arrow_forward</span>
              </a>
            </div>

            <div className="contact-card">
              <div className="contact-icon">
                <span className="material-icons">help_outline</span>
              </div>
              <h2 className="contact-card-title">Support</h2>
              <p className="contact-card-text">
                Need help getting started? Check out our documentation or reach out for assistance.
              </p>
              <Link href="/learn-more" className="contact-button secondary">
                Learn More
                <span className="material-icons">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="info-section">
            <h2 className="info-title">Why Reach Out?</h2>
            <div className="info-list">
              <div className="info-item">
                <span className="material-icons">check_circle</span>
                <span>Get personalized onboarding assistance</span>
              </div>
              <div className="info-item">
                <span className="material-icons">check_circle</span>
                <span>Discuss custom enterprise solutions</span>
              </div>
              <div className="info-item">
                <span className="material-icons">check_circle</span>
                <span>Report issues or provide feedback</span>
              </div>
              <div className="info-item">
                <span className="material-icons">check_circle</span>
                <span>Learn about new features and updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-logo">
            <Image
              src="/hootlogo.png"
              alt="Hoot Logo"
              width={120}
              height={40}
              className="footer-logo-image"
            />
          </div>
          <nav className="footer-nav">
            <Link href="/learn-more" className="footer-link">
              Learn More
            </Link>
            <Link href="/contact" className="footer-link">
              Contact
            </Link>
            <a href="https://discord.gg/6xEjW6SYxj" target="_blank" rel="noopener noreferrer" className="footer-link">
              Discord
            </a>
          </nav>
          <div className="footer-copyright">
            © <span className="gold-text">Hoot</span> 2026. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
