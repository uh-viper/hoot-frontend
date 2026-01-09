"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "../actions/auth";
import "../styles/base.css";
import "../styles/responsive.css";
import "./page.css";

export default function SignUpPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
            <h1 className="auth-title">Create <span className="gold-text">Account</span></h1>
            <p className="auth-subtitle">Automation starts here</p>
            
            {searchParams.error && (
              <div className="error-message">
                {searchParams.error}
              </div>
            )}
            
            <form action={async (formData) => {
              startTransition(async () => {
                try {
                  await signUp(formData)
                  // If signUp doesn't redirect, manually redirect
                  router.push('/auth/check-email')
                } catch (error) {
                  // Error is handled by redirect in signUp
                  console.error('Signup error:', error)
                }
              })
            }} className="auth-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="discord">Discord Username</label>
                <input 
                  type="text" 
                  id="discord" 
                  name="discord" 
                  placeholder="Enter your Discord username"
                  required
                />
              </div>
              
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
                    placeholder="Create a password"
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
              </div>

              <button type="submit" className="auth-button" disabled={isPending}>
                <span className="material-icons">person_add</span>
                {isPending ? "Creating..." : "Create Account"}
              </button>
            </form>
            
            <div className="policy-agreement">
              <p className="policy-agreement-text">
                By creating an account you agree to the{" "}
                <Link href="/terms-of-service" className="policy-link">Terms of Service</Link>
                {", "}
                <Link href="/privacy-policy" className="policy-link">Privacy Policy</Link>
                {", and "}
                <Link href="/refund-policy" className="policy-link">Refund Policy</Link>
              </p>
            </div>
            
            <div className="auth-footer">
              <p>Already have an account? <Link href="/login" className="auth-link">Sign in</Link></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}