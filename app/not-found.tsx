'use client'

import Link from 'next/link'
import Image from 'next/image'
import './styles/not-found.css'

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        {/* Logo */}
        <div className="not-found-logo">
          <Link href="/">
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
        <h1 className="not-found-404">
          404
        </h1>

        <h2 className="not-found-title">
          Oops. Looks like this page doesn't exist!
        </h2>

        <p className="not-found-description">
          The page you're looking for might have been moved, deleted, or doesn't exist.
        </p>

        {/* CTA Buttons */}
        <div className="not-found-buttons">
          <Link
            href="/"
            className="not-found-btn-primary"
          >
            Go Home
          </Link>

          <Link
            href="/dashboard"
            className="not-found-btn-secondary"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
