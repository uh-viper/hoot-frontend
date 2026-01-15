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
    .select('enabled, expected_hours, updated_at, message')
    .single()

  const isEnabled = maintenance?.enabled ?? false
  const expectedHours = maintenance?.expected_hours
  const updatedAt = maintenance?.updated_at
  const message = maintenance?.message

  // Calculate expected time from updated_at + hours
  let expectedTime: string | null = null
  if (expectedHours && updatedAt && expectedHours > 0) {
    const updated = new Date(updatedAt)
    const expected = new Date(updated.getTime() + expectedHours * 60 * 60 * 1000)
    expectedTime = expected.toISOString()
  }

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
