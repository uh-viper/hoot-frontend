"use client";

import { useState } from 'react'
import Link from 'next/link'
import { useToast } from '../../../contexts/ToastContext'
import { updateProfile, updatePassword, updateEmail } from '../actions/settings'

interface SettingsFormProps {
  initialName: string
  initialEmail: string
  initialDiscordUsername: string
}

export default function SettingsForm({ initialName, initialEmail, initialDiscordUsername }: SettingsFormProps) {
  const { showSuccess, showError } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: initialName,
    email: initialEmail,
    discordUsername: initialDiscordUsername,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Update profile (name and discord username)
      const profileResult = await updateProfile({
        name: formData.name,
        discordUsername: formData.discordUsername,
      })

      if (profileResult?.error) {
        showError(profileResult.error)
        setIsLoading(false)
        return
      }

      // If email changed, update email (requires verification)
      if (formData.email !== initialEmail) {
        const emailResult = await updateEmail({
          newEmail: formData.email,
        })

        if (emailResult?.error) {
          showError(emailResult.error)
        } else {
          showSuccess(emailResult?.message || 'Email update confirmation sent. Please check your new email inbox.')
        }
      } else {
        showSuccess('Profile updated successfully!')
      }

      // Clear password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      showError('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.newPassword !== formData.confirmPassword) {
      showError('New passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.newPassword.length < 6) {
      showError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const result = await updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      })

      if (result?.error) {
        showError(result.error)
      } else {
        showSuccess('Password updated successfully!')
        // Clear password fields
        setFormData((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }))
      }
    } catch (error) {
      showError('Failed to update password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="settings-container">
      {/* Profile Settings */}
      <div className="settings-section-box">
        <div className="settings-section-header">
          <div className="settings-section-icon">
            <span className="material-icons">person</span>
          </div>
          <h2 className="settings-section-title">Profile Settings</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="settings-form">
          <div className="settings-form-field">
            <label htmlFor="name" className="settings-label">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="settings-input"
              placeholder="Enter your full name"
            />
          </div>

          <div className="settings-form-field">
            <label htmlFor="email" className="settings-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="settings-input"
              placeholder="Your email address"
            />
            <span className="settings-hint">A confirmation email will be sent to your new address</span>
          </div>

          <div className="settings-form-field">
            <label htmlFor="discordUsername" className="settings-label">
              Discord Username
            </label>
            <input
              type="text"
              id="discordUsername"
              name="discordUsername"
              value={formData.discordUsername}
              onChange={handleInputChange}
              className="settings-input"
              placeholder="Enter your Discord username"
            />
          </div>

          <div className="settings-form-field">
            <button
              type="submit"
              disabled={isLoading}
              className="settings-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="material-icons spinning">sync</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-icons">save</span>
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Password Settings */}
      <div className="settings-section-box">
        <div className="settings-section-header">
          <div className="settings-section-icon">
            <span className="material-icons">lock</span>
          </div>
          <h2 className="settings-section-title">Password Settings</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="settings-form">
          <div className="settings-form-field">
            <label htmlFor="currentPassword" className="settings-label">
              Current Password
            </label>
            <div className="settings-password-wrapper">
              <input
                type={showCurrentPassword ? "text" : "password"}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="settings-input"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                className="settings-password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                <span className="material-icons">
                  {showCurrentPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="settings-form-field">
            <label htmlFor="newPassword" className="settings-label">
              New Password
            </label>
            <div className="settings-password-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="settings-input"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="settings-password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                <span className="material-icons">
                  {showNewPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <span className="settings-hint">Must be at least 6 characters</span>
          </div>

          <div className="settings-form-field">
            <label htmlFor="confirmPassword" className="settings-label">
              Confirm New Password
            </label>
            <div className="settings-password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="settings-input"
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                className="settings-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <span className="material-icons">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="settings-form-field">
            <button
              type="submit"
              disabled={isLoading}
              className="settings-submit-btn"
            >
              {isLoading ? (
                <>
                  <span className="material-icons spinning">sync</span>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span className="material-icons">lock_reset</span>
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>

          <div className="settings-form-field">
            <Link href="/forgot-password" className="settings-forgot-password-link">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>

      {/* API Key Settings */}
      <div className="settings-section-box">
        <div className="settings-section-header">
          <div className="settings-section-icon">
            <span className="material-icons">key</span>
          </div>
          <h2 className="settings-section-title">API Access</h2>
        </div>

        <div className="settings-api-content">
          <div className="settings-api-badge">
            <span className="material-icons">schedule</span>
            <span>Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Policy Links */}
      <div className="settings-section-box">
        <div className="settings-section-header">
          <div className="settings-section-icon">
            <span className="material-icons">description</span>
          </div>
          <h2 className="settings-section-title">Legal & Policies</h2>
        </div>

        <div className="settings-policies-grid">
          <Link href="/terms-of-service" className="settings-policy-link">
            <span className="material-icons">gavel</span>
            <div className="settings-policy-link-content">
              <span className="settings-policy-link-title">Terms of Service</span>
              <span className="settings-policy-link-subtitle">View our terms and conditions</span>
            </div>
            <span className="material-icons settings-policy-link-arrow">chevron_right</span>
          </Link>

          <Link href="/privacy-policy" className="settings-policy-link">
            <span className="material-icons">privacy_tip</span>
            <div className="settings-policy-link-content">
              <span className="settings-policy-link-title">Privacy Policy</span>
              <span className="settings-policy-link-subtitle">Learn how we protect your data</span>
            </div>
            <span className="material-icons settings-policy-link-arrow">chevron_right</span>
          </Link>

          <Link href="/refund-policy" className="settings-policy-link">
            <span className="material-icons">receipt</span>
            <div className="settings-policy-link-content">
              <span className="settings-policy-link-title">Refund Policy</span>
              <span className="settings-policy-link-subtitle">Understand our refund process</span>
            </div>
            <span className="material-icons settings-policy-link-arrow">chevron_right</span>
          </Link>
        </div>
      </div>

      {/* Additional Links */}
      <div className="settings-section-box">
        <div className="settings-section-header">
          <div className="settings-section-icon">
            <span className="material-icons">info</span>
          </div>
          <h2 className="settings-section-title">More Information</h2>
        </div>

        <div className="settings-policies-grid">
          <Link href="/learn-more" className="settings-policy-link">
            <span className="material-icons">article</span>
            <div className="settings-policy-link-content">
              <span className="settings-policy-link-title">Learn More</span>
              <span className="settings-policy-link-subtitle">Discover more about Hoot</span>
            </div>
            <span className="material-icons settings-policy-link-arrow">chevron_right</span>
          </Link>

          <Link href="/contact" className="settings-policy-link">
            <span className="material-icons">mail</span>
            <div className="settings-policy-link-content">
              <span className="settings-policy-link-title">Contact</span>
              <span className="settings-policy-link-subtitle">Get in touch with our team</span>
            </div>
            <span className="material-icons settings-policy-link-arrow">chevron_right</span>
          </Link>

          <a
            href="https://discord.gg/b8RSYKNNbR"
            target="_blank"
            rel="noopener noreferrer"
            className="settings-policy-link"
          >
            <span className="material-icons">forum</span>
            <div className="settings-policy-link-content">
              <span className="settings-policy-link-title">Discord</span>
              <span className="settings-policy-link-subtitle">Join our community server</span>
            </div>
            <span className="material-icons settings-policy-link-arrow">chevron_right</span>
          </a>
        </div>
      </div>
    </div>
  )
}
