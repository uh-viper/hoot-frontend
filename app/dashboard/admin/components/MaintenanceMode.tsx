'use client'

import { useState, useEffect } from 'react'
import { getMaintenanceMode, updateMaintenanceMode } from '@/app/actions/maintenance-mode'
import { useToast } from '@/app/contexts/ToastContext'
import './admin-client.css'

export default function MaintenanceMode() {
  const { showError, showSuccess } = useToast()
  const [enabled, setEnabled] = useState(false)
  const [expectedHours, setExpectedHours] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  // Load current maintenance mode status
  useEffect(() => {
    const loadMaintenanceMode = async () => {
      setIsLoading(true)
      const result = await getMaintenanceMode()
      if (result.success && result.data) {
        setEnabled(result.data.enabled)
        if (result.data.expected_hours) {
          setExpectedHours(result.data.expected_hours.toString())
        } else {
          setExpectedHours('')
        }
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
    
    // Get expected hours as number
    const hours = expectedHours && !isNaN(Number(expectedHours)) && Number(expectedHours) > 0
      ? Number(expectedHours)
      : null

    const result = await updateMaintenanceMode(
      newEnabled,
      hours,
      null
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

  const handleHoursChange = async (hours: string) => {
    setExpectedHours(hours)
    
    // Auto-save when hours change if maintenance is enabled
    if (enabled && hours && !isNaN(Number(hours)) && Number(hours) > 0) {
      setIsUpdating(true)
      const hoursNum = Number(hours)

      const result = await updateMaintenanceMode(
        enabled,
        hoursNum,
        null
      )

      if (result.success) {
        showSuccess('Expected time updated')
      } else {
        showError(result.error || 'Failed to update expected time')
      }
      setIsUpdating(false)
    }
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
              onChange={(e) => handleHoursChange(e.target.value)}
              disabled={isUpdating}
              className="maintenance-mode-input"
              placeholder="Enter hours until completion (e.g., 2.5)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
