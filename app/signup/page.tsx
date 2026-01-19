"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../contexts/ToastContext";
import { signUp } from "../actions/auth";
import SignUpFallback from "../components/SignUpFallback";
import "./page.css";

function SignUpPageContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useToast();

  // Show error from URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const decodedError = decodeURIComponent(error);
      let errorMessage = decodedError;
      
      if (decodedError.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      } else if (decodedError.includes('Password')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (decodedError.includes('Email')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      showError(errorMessage);
      // Clean URL
      router.replace('/signup', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('error')]);

  return (
    <div className="auth-page">
      {/* Auth Section */}
      <section className="auth-section">
        <div className="auth-container">
          <div className="auth-card">
            <h1 className="auth-title">Create <span className="gold-text">Account</span></h1>
            <p className="auth-subtitle">Automation starts here</p>
            
            <form action={async (formData) => {
              startTransition(async () => {
                const result = await signUp(formData)
                if (result?.error) {
                  let errorMessage = result.error;
                  if (result.error.includes('User already registered')) {
                    errorMessage = 'An account with this email already exists. Please sign in instead.';
                  } else if (result.error.includes('Password')) {
                    errorMessage = 'Password must be at least 6 characters long.';
                  } else if (result.error.includes('Email')) {
                    errorMessage = 'Please enter a valid email address.';
                  }
                  showError(errorMessage);
                } else if (result?.success) {
                  showSuccess('Account created! Please check your email to confirm your account.');
                  router.push('/auth/check-email')
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

              <div className="form-group">
                <label htmlFor="referral">Referral Code (optional)</label>
                <input 
                  type="text" 
                  id="referral" 
                  name="referral" 
                  placeholder="Enter referral code if you have one"
                  style={{ textTransform: 'uppercase' }}
                />
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

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpPageContent />
    </Suspense>
  );
}