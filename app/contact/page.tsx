import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from '@/lib/auth/validate-session'
import "./page.css";

export const metadata: Metadata = {
  title: 'Hoot - Contact',
}

export default async function Contact() {
  const user = await getSessionUser()

  return (
    <div className="contact-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link href={user ? "/dashboard" : "/"} className="logo-link">
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
            {user ? (
              <Link href="/dashboard" className="nav-button">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Sign In
                </Link>
                <Link href="/signup" className="nav-button">
                  Sign Up
                </Link>
              </>
            )}
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
                href="https://discord.gg/b8RSYKNNbR" 
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
                href="mailto:support@hootservices.com" 
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
      <Footer />
    </div>
  );
}
