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

        {/* Message */}
        <h1 className="not-found-title">
          Oops. Looks like this page doesn't exist!
        </h1>

        {/* CTA Button */}
        <div className="not-found-buttons">
          <Link
            href="/"
            className="not-found-btn-primary"
          >
            Home Page
          </Link>
        </div>
      </div>
    </div>
  )
}
