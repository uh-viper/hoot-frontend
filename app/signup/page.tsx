import Link from "next/link";
import "./page.css";

export default function SignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Create Account</h1>
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
            
            <button type="submit" className="btn-gold-full">
              <span className="material-icons">person_add</span>
              Create Account
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Already have an account? <Link href="/login" className="auth-link">Sign in</Link></p>
            <Link href="/" className="auth-link">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}