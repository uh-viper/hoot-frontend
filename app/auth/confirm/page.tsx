"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmail } from "../../actions/auth";
import "../../styles/base.css";
import "../../styles/responsive.css";
import "./page.css";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    // If no token_hash, show error
    if (!token_hash || !type) {
      setStatus('error');
      setMessage('Invalid confirmation link. Please check your email and try again.');
      return;
    }

    // Verify the email using server action
    const handleVerify = async () => {
      try {
        const result = await verifyEmail(token_hash, type);
        
        if (result.error) {
          setStatus('error');
          setMessage(result.error || 'Email confirmation failed. Please try again or request a new confirmation email.');
        } else {
          setStatus('success');
          setMessage('Email confirmed successfully! Redirecting to dashboard...');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      }
    };

    handleVerify();
  }, [searchParams, router]);

  return (
    <div className="confirm-page">
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

      {/* Confirmation Section */}
      <section className="confirm-section">
        <div className="confirm-container">
          <div className="confirm-card">
            {status === 'loading' && (
              <>
                <div className="confirm-icon-wrapper loading">
                  <span className="material-icons">mail_outline</span>
                </div>
                <h1 className="confirm-title">Confirming Your <span className="gold-text">Email</span></h1>
                <p className="confirm-message">
                  Please wait while we verify your email address...
                </p>
                <div className="loading-spinner"></div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="confirm-icon-wrapper success">
                  <span className="material-icons">check_circle</span>
                </div>
                <h1 className="confirm-title">Email <span className="gold-text">Confirmed</span></h1>
                <p className="confirm-message success">
                  {message}
                </p>
                <Link href="/dashboard" className="confirm-button">
                  <span className="material-icons">dashboard</span>
                  Go to Dashboard
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="confirm-icon-wrapper error">
                  <span className="material-icons">error_outline</span>
                </div>
                <h1 className="confirm-title">Confirmation <span className="gold-text">Failed</span></h1>
                <p className="confirm-message error">
                  {message}
                </p>
                <div className="confirm-actions">
                  <Link href="/login" className="confirm-button secondary">
                    <span className="material-icons">login</span>
                    Back to Login
                  </Link>
                  <Link href="/signup" className="confirm-button">
                    <span className="material-icons">person_add</span>
                    Sign Up Again
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ConfirmEmail() {
  return (
    <Suspense fallback={
      <div className="confirm-page">
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

        <section className="confirm-section">
          <div className="confirm-container">
            <div className="confirm-card">
              <div className="confirm-icon-wrapper loading">
                <span className="material-icons">mail_outline</span>
              </div>
              <h1 className="confirm-title">Confirming Your <span className="gold-text">Email</span></h1>
              <p className="confirm-message">
                Please wait...
              </p>
              <div className="loading-spinner"></div>
            </div>
          </div>
        </section>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
}
