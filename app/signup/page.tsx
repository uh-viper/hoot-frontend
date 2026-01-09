import Link from "next/link";
import Image from "next/image";
import Footer from "../components/Footer";
import "../styles/base.css";
import "../styles/footer.css";
import "./page.css";

export default function SignUpPage() {
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
            <p className="auth-subtitle">Start automating your TikTok growth today</p>
            
            <form className="auth-form">
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
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="Create a password"
                  required
                />
              </div>
              
              <button type="submit" className="auth-button">
                <span className="material-icons">person_add</span>
                Create Account
              </button>
            </form>
            
            <div className="auth-footer">
              <p>Already have an account? <Link href="/login" className="auth-link">Sign in</Link></p>
              <Link href="/" className="auth-link-back">← Back to home</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}