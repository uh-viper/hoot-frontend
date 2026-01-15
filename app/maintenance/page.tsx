import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import MaintenanceCountdown from './components/MaintenanceCountdown'
import '../styles/maintenance.css'

export const metadata: Metadata = {
  title: 'Hoot - Maintenance',
}

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const supabase = await createClient()
  
  // Get maintenance mode info
  const { data: maintenance } = await supabase
    .from('maintenance_mode')
    .select('enabled, expected_time, message')
    .single()

  const isEnabled = maintenance?.enabled ?? false
  const expectedTime = maintenance?.expected_time
  const message = maintenance?.message

  // If maintenance is not active, show "No active maintenance" message
  if (!isEnabled) {
    return (
      <div className="maintenance-container">
        <div className="maintenance-content">
          <div className="maintenance-icon">
            <span className="material-icons">check_circle</span>
          </div>
          <h1 className="maintenance-title">No Active Maintenance</h1>
          <p className="maintenance-description">
            The site is currently accessible and operating normally.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="maintenance-container">
      <div className="maintenance-content">
        <div className="maintenance-icon">
          <span className="material-icons">build</span>
        </div>
        <h1 className="maintenance-title">Undergoing Maintenance</h1>
        <p className="maintenance-description">
          We're currently performing scheduled maintenance to improve your experience.
        </p>
        {expectedTime && <MaintenanceCountdown expectedTime={expectedTime} />}
        {message && (
          <div className="maintenance-message">
            <p>{message}</p>
          </div>
        )}
        <div className="maintenance-footer">
          <p>We'll be back soon. Thank you for your patience!</p>
        </div>
      </div>
    </div>
  )
}
