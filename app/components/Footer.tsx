import Link from "next/link";
import Image from "next/image";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-logo">
          <Image
            src="/hootlogo.png"
            alt="Hoot Logo"
            width={120}
            height={40}
            className="footer-logo-image"
          />
        </div>
        <nav className="footer-nav">
          <Link href="/" className="footer-link">
            Home
          </Link>
          <Link href="/learn-more" className="footer-link">
            Learn More
          </Link>
          <Link href="/contact" className="footer-link">
            Contact
          </Link>
          <a href="https://discord.gg/6xEjW6SYxj" target="_blank" rel="noopener noreferrer" className="footer-link">
            Discord
          </a>
        </nav>
        <div className="footer-copyright">
          © <span className="gold-text">Hoot</span> 2026. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
