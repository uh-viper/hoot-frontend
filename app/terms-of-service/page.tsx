import Link from "next/link";
import Image from "next/image";
import Footer from "../components/Footer";
import "../styles/base.css";
import "../styles/footer.css";
import "../styles/responsive.css";
import "./page.css";

export default function TermsOfService() {
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
          <h1 className="policy-title">Terms of <span className="gold-text">Service</span></h1>
          <p className="policy-updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="policy-content">
            <section className="policy-section-item">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Hoot's services, you accept and agree to be bound by these Terms of Service. 
                If you do not agree with any part of these terms, you may not access or use our services.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>2. Service Description</h2>
              <p>
                Hoot provides automation services for creating TikTok Business Centers. Our platform allows users to 
                purchase credits and generate Business Centers according to the limits and restrictions outlined in 
                our service.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>3. Account Registration</h2>
              <p>
                To use our services, you must create an account by providing accurate, current, and complete information. 
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>4. Credits and Payment</h2>
              <p>
                Credits are purchased in advance and are non-refundable. Credits are only deducted from your account 
                after successful delivery of Business Center credentials to your account vault. Failed creations result 
                in automatic credit refunds.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>5. Service Limits</h2>
              <p>
                You may create up to 25 Business Centers at once, with a maximum of 50 per day. These limits are subject 
                to change at our discretion with prior notice.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>6. Prohibited Uses</h2>
              <p>
                You agree not to use our services for any illegal purposes or in violation of TikTok's terms of service. 
                You are solely responsible for compliance with all applicable laws and platform policies.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>7. Limitation of Liability</h2>
              <p>
                Hoot shall not be liable for any indirect, incidental, special, or consequential damages arising from your 
                use of our services. Our total liability shall not exceed the amount you paid for credits in the 30 days 
                preceding the claim.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. Continued use of our services after 
                changes constitutes acceptance of the modified terms.
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
