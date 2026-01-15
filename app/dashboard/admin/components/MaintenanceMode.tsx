'use client'

import { useState, useEffect } from 'react'
import { getMaintenanceMode, updateMaintenanceMode } from '@/app/actions/maintenance-mode'
import { useToast } from '@/app/contexts/ToastContext'
import './admin-client.css'

export default function MaintenanceMode() {
  const { showError, showSuccess } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [expectedTime, setExpectedTime] = useState('')
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
          // Convert UTC time to local datetime-local format
          const localDate = new Date(result.data.expected_time)
          const year = localDate.getFullYear()
          const month = String(localDate.getMonth() + 1).padStart(2, '0')
          const day = String(localDate.getDate()).padStart(2, '0')
          const hours = String(localDate.getHours()).padStart(2, '0')
          const minutes = String(localDate.getMinutes()).padStart(2, '0')
          setExpectedTime(`${year}-${month}-${day}T${hours}:${minutes}`)
        } else {
          setExpectedTime('')
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
    
    // Convert datetime-local to ISO string (UTC)
    const expectedTimeISO = expectedTime 
      ? new Date(expectedTime).toISOString() 
      : null

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
    
    // Convert datetime-local to ISO string (UTC)
    const expectedTimeISO = expectedTime 
      ? new Date(expectedTime).toISOString() 
      : null

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
              {enabled ? (
                <>
                  <span className="material-icons status-icon enabled">check_circle</span>
                  <strong>Enabled</strong> - Site is in maintenance mode
                </>
              ) : (
                <>
                  <span className="material-icons status-icon disabled">cancel</span>
                  <strong>Disabled</strong> - Site is accessible
                </>
              )}
            </span>
          </div>
        </div>

        <div className="maintenance-mode-settings">
          <div className="maintenance-mode-field">
            <label htmlFor="expected-time" className="maintenance-mode-label">
              <span className="material-icons">schedule</span>
              Expected Time
            </label>
            <input
              id="expected-time"
              type="datetime-local"
              value={expectedTime}
              onChange={(e) => setExpectedTime(e.target.value)}
              disabled={isUpdating}
              className="maintenance-mode-input"
              placeholder="Select expected completion time"
            />
            <p className="maintenance-mode-hint">
              Optional: Set when maintenance is expected to complete. This will be displayed on the maintenance page.
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
            <p className="maintenance-mode-hint">
              Optional: Add a custom message that will be displayed on the maintenance page.
            </p>
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
