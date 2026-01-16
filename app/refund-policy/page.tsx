import { Metadata } from 'next'
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from '@/lib/auth/validate-session'
import "../styles/footer.css";
import "./page.css";

export const metadata: Metadata = {
  title: 'Hoot - Refund Policy',
}

export default async function RefundPolicy() {
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
          <h1 className="policy-title">Refund <span className="gold-text">Policy</span></h1>
          <p className="policy-updated">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="policy-content">
            <section className="policy-section-item">
              <h2>1. 100% Delivery Guarantee</h2>
              <p>
                Hoot guarantees 100% delivery of Business Centers. Credits are only deducted from your account after 
                the Business Center login credentials are successfully delivered to your account vault.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>2. Automatic Refunds for Failed Creations</h2>
              <p>
                If a Business Center creation fails for any reason, your credits are automatically refunded to your 
                account. No manual intervention is required, and you will not lose credits for failed attempts.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>3. No Refunds for Purchased Credits</h2>
              <p>
                Once credits are purchased, they are non-refundable for cash or other payment methods. Credits may 
                only be used within the Hoot platform for Business Center creation services.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>4. Credit Expiration</h2>
              <p>
                Credits do not expire and remain in your account until used. There is no time limit on when you can 
                use your purchased credits.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>5. Service Issues</h2>
              <p>
                In the event of extended service outages or technical issues that prevent Business Center creation, 
                affected credits will be automatically refunded to your account.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>6. Disputed Transactions</h2>
              <p>
                If you believe there is an error in a credit purchase or deduction, please contact our support team 
                within 30 days of the transaction. We will investigate and resolve any valid disputes.
              </p>
            </section>

            <section className="policy-section-item">
              <h2>7. Contact for Refund Inquiries</h2>
              <p>
                For any questions about refunds or credit-related issues, please contact us at{" "}
                <a href="mailto:support@hootservices.com" className="policy-link">support@hootservices.com</a>
                {" "}or through our Discord server.
              </p>
            </section>
          </div>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}
