'use client'

import { useState, useEffect } from 'react'

interface MaintenanceCountdownProps {
  expectedTime: string
}

export default function MaintenanceCountdown({ expectedTime }: MaintenanceCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const expected = new Date(expectedTime).getTime()
      const diff = expected - now

      if (diff <= 0) {
        setTimeRemaining('Maintenance should be complete soon')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [expectedTime])

  if (!timeRemaining) {
    return null
  }

  return (
    <div className="maintenance-countdown">
      <span className="material-icons">timer</span>
      <span>Estimated completion in: {timeRemaining}</span>
    </div>
  )
}
