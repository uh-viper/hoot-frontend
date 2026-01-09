import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import Footer from "../components/Footer";
import "../styles/footer.css";
import "./page.css";

export const metadata: Metadata = {
  title: 'Hoot - Privacy Policy',
}

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
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

      {/* Content */}
      <section className="policy-section">
        <div className="policy-container">
          <h1 className="policy-title">Privacy <span className="gold-text">Policy</span></h1>
          <p className="policy-updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="policy-content">
            <section className="policy-section-item">
              <h2>1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, including your name, email address, Discord username, 
                and account credentials. We also collect information about your use of our services, including credit 
                purchases and Business Center creation activity.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to provide, maintain, and improve our services, process transactions, 
                send you technical notices and support messages, and communicate with you about our services.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>3. Information Sharing</h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties. We may share your information 
                only as necessary to provide our services, comply with legal obligations, or protect our rights and safety.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>4. Data Security</h2>
              <p>
                We implement appropriate security measures to protect your personal information. However, no method of 
                transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>5. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal information at any time through your account 
                settings or by contacting us. You may also request a copy of the data we hold about you.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>6. Cookies and Tracking</h2>
              <p>
                We use cookies and similar tracking technologies to track activity on our service and store certain 
                information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>7. Changes to This Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
                Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
