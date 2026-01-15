'use client'

import { useState, useEffect } from 'react'
import { getMaintenanceMode, updateMaintenanceMode } from '@/app/actions/maintenance-mode'
import { useToast } from '@/app/contexts/ToastContext'
import './admin-client.css'

export default function MaintenanceMode() {
  const { showError, showSuccess } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [expectedTime, setExpectedTime] = useState('')
  const [expectedHours, setExpectedHours] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  // Load current maintenance mode status
  useEffect(() => {
    const loadMaintenanceMode = async () => {
      setIsLoading(true)
      const result = await getMaintenanceMode()
      if (result.success && result.data) {
        setEnabled(result.data.enabled)
        if (result.data.expected_time) {
          // Store the full ISO string for saving
          setExpectedTime(result.data.expected_time)
          // Calculate hours from now
          const now = new Date()
          const expected = new Date(result.data.expected_time)
          const diffMs = expected.getTime() - now.getTime()
          const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)))
          setExpectedHours(diffHours.toString())
        } else {
          setExpectedTime('')
          setExpectedHours('')
        }
        setMessage(result.data.message || '')
      } else {
        showError(result.error || 'Failed to load maintenance mode')
      }
      setIsLoading(false)
    }

    loadMaintenanceMode()
  }, [showError])

  const handleToggle = async () => {
    setIsUpdating(true)
    const newEnabled = !enabled
    
    // Calculate expected time from hours
    let expectedTimeISO: string | null = null
    if (expectedHours && !isNaN(Number(expectedHours)) && Number(expectedHours) > 0) {
      const hours = Number(expectedHours)
      const now = new Date()
      const expected = new Date(now.getTime() + hours * 60 * 60 * 1000)
      expectedTimeISO = expected.toISOString()
      setExpectedTime(expectedTimeISO)
    } else {
      expectedTimeISO = expectedTime || null
    }

    const result = await updateMaintenanceMode(
      newEnabled,
      expectedTimeISO,
      message || null
    )

    if (result.success) {
      setEnabled(newEnabled)
      showSuccess(
        newEnabled 
          ? 'Maintenance mode enabled. All non-admin users will see the maintenance page.'
          : 'Maintenance mode disabled. Site is now accessible to all users.'
      )
    } else {
      showError(result.error || 'Failed to update maintenance mode')
    }
    setIsUpdating(false)
  }

  const handleSave = async () => {
    setIsUpdating(true)
    
    // Calculate expected time from hours
    let expectedTimeISO: string | null = null
    if (expectedHours && !isNaN(Number(expectedHours)) && Number(expectedHours) > 0) {
      const hours = Number(expectedHours)
      const now = new Date()
      const expected = new Date(now.getTime() + hours * 60 * 60 * 1000)
      expectedTimeISO = expected.toISOString()
      setExpectedTime(expectedTimeISO)
    } else {
      expectedTimeISO = expectedTime || null
    }

    const result = await updateMaintenanceMode(
      enabled,
      expectedTimeISO,
      message || null
    )

    if (result.success) {
      showSuccess('Maintenance mode settings saved successfully')
    } else {
      showError(result.error || 'Failed to update maintenance mode')
    }
    setIsUpdating(false)
  }

  if (isLoading) {
    return (
      <div className="maintenance-mode-container">
        <div className="maintenance-mode-loading">
          <span className="material-icons spinning">sync</span>
          Loading maintenance mode settings...
        </div>
      </div>
    )
  }

  return (
    <div className="maintenance-mode-container">
      <div className="maintenance-mode-header">
        <h3 className="maintenance-mode-title">
          <span className="material-icons">build</span>
          Maintenance Mode
        </h3>
        <p className="maintenance-mode-description">
          Enable maintenance mode to temporarily shut down the site for all non-admin users.
          Admins will still be able to access the site during maintenance.
        </p>
      </div>

      <div className="maintenance-mode-content">
        <div className="maintenance-mode-toggle">
          <label className="maintenance-mode-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              disabled={isUpdating}
            />
            <span className="maintenance-mode-slider"></span>
          </label>
          <div className="maintenance-mode-toggle-label">
            <span className="maintenance-mode-status">
              {enabled ? 'Site is in maintenance mode' : 'Site is accessible'}
            </span>
          </div>
        </div>

        <div className="maintenance-mode-settings">
          <div className="maintenance-mode-field">
            <label htmlFor="expected-hours" className="maintenance-mode-label">
              <span className="material-icons">schedule</span>
              Expected Time (Hours)
            </label>
            <input
              id="expected-hours"
              type="number"
              min="0"
              step="0.5"
              value={expectedHours}
              onChange={(e) => setExpectedHours(e.target.value)}
              disabled={isUpdating}
              className="maintenance-mode-input"
              placeholder="Enter hours until completion (e.g., 2.5)"
            />
            <p className="maintenance-mode-hint">
              Optional: Set how many hours until maintenance is expected to complete. A countdown will be displayed on the maintenance page.
            </p>
          </div>

          <div className="maintenance-mode-field">
            <label htmlFor="message" className="maintenance-mode-label">
              <span className="material-icons">message</span>
              Custom Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isUpdating}
              className="maintenance-mode-textarea"
              placeholder="Optional: Add a custom message to display on the maintenance page"
              rows={4}
            />
          </div>

          <div className="maintenance-mode-actions">
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="maintenance-mode-save-btn"
            >
              {isUpdating ? (
                <>
                  <span className="material-icons spinning">sync</span>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-icons">save</span>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
