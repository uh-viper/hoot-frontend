"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../contexts/ToastContext";
import { resetPasswordForEmail } from "../actions/auth";
import "../login/page.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", email);
      
      const result = await resetPasswordForEmail(formData);
      
      if (result?.error) {
        showError(result.error);
      } else {
        showSuccess("Password reset email sent! Please check your inbox.");
        router.push("/login");
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
            <h1 className="auth-title">Reset <span className="gold-text">Password</span></h1>
            <p className="auth-subtitle">Enter your email to receive a password reset link</p>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            
            <button type="submit" className="auth-button" disabled={isPending}>
              <span className="material-icons">mail</span>
              {isPending ? "Sending..." : "Send Reset Link"}
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
