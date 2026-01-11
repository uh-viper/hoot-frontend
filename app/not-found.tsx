import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%'
      }}>
        {/* Logo */}
        <div style={{
          marginBottom: '3rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Link href="/" style={{ display: 'inline-block' }}>
            <Image
              src="/hootlogo.png"
              alt="Hoot Logo"
              width={200}
              height={67}
              priority
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </Link>
        </div>

        {/* 404 Message */}
        <h1 style={{
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          fontWeight: 700,
          marginBottom: '1rem',
          fontFamily: 'var(--font-outfit)',
          letterSpacing: '-0.02em'
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
          fontWeight: 600,
          marginBottom: '1rem',
          fontFamily: 'var(--font-outfit)',
          color: '#ffffff'
        }}>
          Oops. Looks like this page doesn't exist!
        </h2>

        <p style={{
          fontSize: '1.125rem',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '3rem',
          fontFamily: 'var(--font-poppins)',
          lineHeight: '1.6'
        }}>
          The page you're looking for might have been moved, deleted, or doesn't exist.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <Link
            href="/"
            style={{
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '10px',
              padding: '1rem 2rem',
              fontSize: '1.125rem',
              fontWeight: 600,
              fontFamily: 'var(--font-poppins)',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 175, 55, 0.3)'
            }}
          >
            Go Home
          </Link>

          <Link
            href="/dashboard"
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '1rem 2rem',
              fontSize: '1.125rem',
              fontWeight: 600,
              fontFamily: 'var(--font-poppins)',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
