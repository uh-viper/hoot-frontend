"use client";

import { useState } from 'react'
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
                  <span className="material-icons">hourglass_empty</span>
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
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className="settings-input"
              placeholder="Enter your current password"
            />
          </div>

          <div className="settings-form-field">
            <label htmlFor="newPassword" className="settings-label">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="settings-input"
              placeholder="Enter your new password"
            />
            <span className="settings-hint">Must be at least 6 characters</span>
          </div>

          <div className="settings-form-field">
            <label htmlFor="confirmPassword" className="settings-label">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="settings-input"
              placeholder="Confirm your new password"
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
                  <span className="material-icons">hourglass_empty</span>
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
        </form>
      </div>
    </div>
  )
}
