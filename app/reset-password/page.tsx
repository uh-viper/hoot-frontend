"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../contexts/ToastContext";
import { verifyPasswordResetToken, updatePasswordFromReset } from "../actions/auth";
import "../login/page.css";

function ResetPasswordPageContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    // Check if we have a code in the URL (Supabase password reset links)
    const code = searchParams?.get("code");
    const tokenHash = searchParams?.get("token_hash");
    const type = searchParams?.get("type");

    const verifyToken = async () => {
      if (code) {
        // If we have a code, we need to exchange it for a session via callback
        // Redirect to auth callback which will handle the exchange and redirect back
        const callbackUrl = `/auth/callback?code=${code}&type=recovery&next=/reset-password`;
        window.location.href = callbackUrl;
        return;
      }

      if (tokenHash && type === "recovery") {
        // Verify the token
        const formData = new FormData();
        formData.append("token_hash", tokenHash);
        formData.append("type", type);

        const result = await verifyPasswordResetToken(formData);
        
        if (result?.error) {
          showError(result.error || "Invalid or expired reset token. Please request a new password reset.");
          setIsVerifying(false);
          setIsTokenValid(false);
          setTimeout(() => {
            router.push("/forgot-password");
          }, 3000);
        } else {
          setIsVerifying(false);
          setIsTokenValid(true);
        }
      } else {
        // No code or token_hash - user navigated directly without valid token
        showError("Invalid reset link. Please request a new password reset.");
        setIsVerifying(false);
        setIsTokenValid(false);
        setTimeout(() => {
          router.push("/forgot-password");
        }, 3000);
      }
    };

    verifyToken();
  }, [searchParams, router, showError]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("password", password);
      
      const result = await updatePasswordFromReset(formData);
      
      if (result?.error) {
        showError(result.error);
      } else {
        showSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
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
            <h1 className="auth-title">Set New <span className="gold-text">Password</span></h1>
            <p className="auth-subtitle">Enter your new password</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"}
                    id="password" 
                    name="password" 
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <span style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "0.25rem", display: "block" }}>Must be at least 6 characters</span>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword" 
                    name="confirmPassword" 
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-icons">
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
            
            <button type="submit" className="auth-button" disabled={isPending}>
              <span className="material-icons">lock_reset</span>
              {isPending ? "Resetting..." : "Reset Password"}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Remember your password? <Link href="/login" className="auth-link">Sign in</Link></p>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <div className="material-icons spinning" style={{ fontSize: "2rem", color: "#d4af37" }}>sync</div>
        </div>
      </div>
    }>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
