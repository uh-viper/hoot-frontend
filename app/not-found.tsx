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

        {/* CTA Buttons */}
        <div className="not-found-buttons">
          <Link
            href="/dashboard"
            className="not-found-btn-primary"
          >
            Dashboard
          </Link>

          <a
            href="https://discord.gg/b8RSYKNNbR"
            target="_blank"
            rel="noopener noreferrer"
            className="not-found-btn-secondary"
          >
            Discord
          </a>
        </div>
      </div>
    </div>
  )
}
