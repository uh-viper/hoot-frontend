"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../contexts/ToastContext";
import { signIn } from "../actions/auth";
import "../styles/base.css";
import "../styles/responsive.css";
import "./page.css";

function LoginPageContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useToast();

  // Show error from URL params (only once) - for backwards compatibility with old redirects
  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      const decodedError = decodeURIComponent(error);
      showError(decodedError);
      // Clean URL immediately without scroll
      setTimeout(() => {
        router.replace('/login', { scroll: false });
      }, 100);
    }
  }, [searchParams, router, showError]);

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await signIn(formData);
      
      if (result?.error) {
        showError(result.error);
      } else {
        // Success - redirect will happen from server action
        router.push('/dashboard');
      }
    });
  };

  return (
    <div className="auth-page">
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

      {/* Auth Section */}
      <section className="auth-section">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Sign <span className="gold-text">In</span></h1>
            <p className="auth-subtitle">Welcome back to Hoot</p>
            
            <form action={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="Enter your email"
                  required
                />
              </div>
              
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"}
                  id="password" 
                  name="password" 
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-icons">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <Link href="/forgot-password" className="forgot-password-link">Forgot password?</Link>
            </div>
            
            <button type="submit" className="auth-button" disabled={isPending}>
              <span className="material-icons">login</span>
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Don't have an account? <Link href="/signup" className="auth-link">Sign up</Link></p>
          </div>
          </div>
        </div>
      </section>

    </div>
  );
}

function LoginFallback() {
  return (
    <div className="auth-page">
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
            <Link href="/login" className="nav-link">Sign In</Link>
            <Link href="/signup" className="nav-button">Sign Up</Link>
          </nav>
        </div>
      </header>
      <section className="auth-section">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Sign <span className="gold-text">In</span></h1>
            <p className="auth-subtitle">Welcome back to Hoot</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}