"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmail } from "../../actions/auth";
import "./page.css";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    // If success param is present (from callback route), show success
    if (success === 'true') {
      setStatus('success');
      setMessage('Your email has been successfully verified! Redirecting you to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    // Handle token_hash flow (older method)
    if (token_hash && type) {
      const handleVerify = async () => {
        try {
          const result = await verifyEmail(token_hash, type);
          
          if (result.error) {
            setStatus('error');
            setMessage(result.error || 'Email confirmation failed. Please try again or request a new confirmation email.');
          } else {
            setStatus('success');
            setMessage('Your email has been successfully verified! Redirecting you to sign in...');
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          }
        } catch (error) {
          setStatus('error');
          setMessage('An error occurred. Please try again.');
        }
      };

      handleVerify();
      return;
    }

    // If no valid params, show error
    setStatus('error');
    setMessage('Invalid confirmation link. Please check your email and try again.');
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
                  Your email has been successfully verified! Redirecting you to sign in...
                </p>
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
