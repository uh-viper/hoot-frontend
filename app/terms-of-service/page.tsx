import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from '@/lib/auth/validate-session'
import "./page.css";

export const metadata: Metadata = {
  title: 'Hoot - Terms of Service',
}

export default async function TermsOfService() {
  const user = await getSessionUser()

  return (
    <div className="policy-page">
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

      {/* Content */}
      <section className="policy-section">
        <div className="policy-container">
          <h1 className="policy-title">Terms of <span className="gold-text">Service</span></h1>
          <p className="policy-updated">Last Updated: January 9, 2026</p>
          
          <div className="policy-content">
            <section className="policy-section-item">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Hoot's services, you accept and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access or use our services.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>2. Service Description</h2>
              <p>
                Hoot provides automation services for creating TikTok Business Centers. Our platform allows users to purchase credits and generate Business Centers according to the limits and restrictions outlined in our service.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>3. Account Registration</h2>
              <p>
                To use our services, you must create an account by providing accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>4. Credits and Payment</h2>
              <p>
                Credits are purchased in advance and are non-refundable. Credits are only deducted from your account after successful delivery of Business Center credentials to your account vault. Failed creations result in automatic credit refunds.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>5. Service Limits</h2>
              <p>
                You may create up to 25 Business Centers at once, with a maximum of 50 per day. These limits are subject to change at our discretion with prior notice to maintain system stability.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>6. Prohibited Uses</h2>
              <p>
                You agree not to use our services for any illegal purposes or in violation of TikTok's terms of service. You are solely responsible for compliance with all applicable laws and platform policies. Hoot acts strictly as a technical intermediary; the end-use of all generated assets is the sole responsibility of the User.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>7. Termination of Service</h2>
              <p>
                Hoot reserves the right to terminate or suspend your account and access to the services at our sole discretion, without prior notice, for conduct that we believe violates these Terms, is harmful to other users, or targets the integrity of our infrastructure (e.g., reverse engineering or unauthorized API scraping). Upon termination, your right to use the Service will cease immediately, and any remaining credits may be forfeited.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>8. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold harmless Hoot, its founders, and employees from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from: (i) your use of and access to the Service; (ii) your violation of any term of these Terms; or (iii) your violation of any third-party right, including without limitation any copyright, property, or privacy right.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>9. Limitation of Liability</h2>
              <p>
                Hoot shall not be liable for any indirect, incidental, special, or consequential damages—including but not limited to the suspension of TikTok accounts, loss of ad spend, or campaign downtime—arising from your use of our services. Our total liability shall not exceed the amount you paid for credits in the 30 days preceding the claim.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>10. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which Hoot operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. Continued use of our services after changes constitutes acceptance of the modified terms.
              </p>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}
