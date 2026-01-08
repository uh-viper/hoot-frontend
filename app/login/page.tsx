import Link from "next/link";
import "./page.css";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Sign In</h1>
          <p className="auth-subtitle">Welcome back to Hoot</p>
          
          <form className="auth-form">
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
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button type="submit" className="btn-gold-full">
              <span className="material-icons">login</span>
              Sign In
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Don't have an account? <Link href="/signup" className="auth-link">Sign up</Link></p>
            <Link href="/" className="auth-link">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}