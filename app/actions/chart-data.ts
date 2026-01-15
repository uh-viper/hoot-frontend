'use server'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { getUserTimezone } from '@/lib/utils/date-timezone'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

export interface ChartDataPoint {
  time: string
  count: number
  label: string
}

export interface ChartData {
  data: ChartDataPoint[]
  total: number
}

export type StatType = 'requested' | 'successful' | 'failures'

/**
 * Get chart data for a specific stat type (requested, successful, failures) from user_jobs
 */
export async function getChartData(
  statType: StatType,
  startDate?: Date,
  endDate?: Date,
  userTimezone?: string
): Promise<{ success: boolean; data?: ChartData; error?: string }> {
  const user = await getSessionUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  try {
    // Calculate date range
    let start: Date
    let end: Date = new Date()
    let groupBy: 'hour' | 'day' = 'hour'

    if (startDate && endDate) {
      // Convert local dates to UTC
      start = dayjs(startDate).utc().startOf('day').toDate()
      end = dayjs(endDate).utc().endOf('day').toDate()
      
      // If custom range is exactly 1 day, use hourly grouping
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      groupBy = daysDiff <= 1 ? 'hour' : 'day'
    } else {
      // Default to this month
      start = dayjs().utc().startOf('month').toDate()
      end = dayjs().utc().endOf('day').toDate()
      groupBy = 'day'
    }

    // Fetch user jobs in the date range
    const { data: jobs, error } = await supabase
      .from('user_jobs')
      .select('created_at, requested_count, successful_count, failed_count')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch jobs:', error)
      return { success: false, error: 'Failed to fetch job data' }
    }

    // Group jobs by time period
    const dataMap = new Map<string, number>()

    // Initialize all time slots with 0
    const timeSlots: string[] = []
    if (groupBy === 'hour') {
      const current = new Date(start)
      const endTime = end.getTime()
      while (current.getTime() <= endTime) {
        const key = current.toISOString().slice(0, 13) + ':00:00'
        timeSlots.push(key)
        dataMap.set(key, 0)
        current.setUTCHours(current.getUTCHours() + 1)
      }
    } else {
      const current = new Date(start)
      const endDateStr = end.toISOString().slice(0, 10)
      while (current.getTime() <= end.getTime()) {
        const key = current.toISOString().slice(0, 10)
        timeSlots.push(key)
        dataMap.set(key, 0)
        if (key === endDateStr) break
        current.setUTCDate(current.getUTCDate() + 1)
      }
    }

    // Sum up the selected stat type for each time slot
    jobs?.forEach((job) => {
      const createdAt = new Date(job.created_at)
      let key: string
      
      if (groupBy === 'hour') {
        const hourDate = new Date(createdAt)
        hourDate.setUTCMinutes(0, 0, 0)
        key = hourDate.toISOString().slice(0, 13) + ':00:00'
      } else {
        key = createdAt.toISOString().slice(0, 10)
      }

      if (dataMap.has(key)) {
        let value = 0
        if (statType === 'requested') {
          value = job.requested_count || 0
        } else if (statType === 'successful') {
          value = job.successful_count || 0
        } else if (statType === 'failures') {
          value = job.failed_count || 0
        }
        dataMap.set(key, (dataMap.get(key) || 0) + value)
      }
    })

    // Get user's timezone - use provided timezone or default to UTC
    // If not provided, we'll use UTC (should be provided from client)
    const tz = userTimezone || 'UTC'

    // Convert to array format - convert UTC times to user's local timezone for display
    const data: ChartDataPoint[] = timeSlots.map((time) => {
      // Parse UTC time string and convert to user's local timezone
      const utcDate = dayjs.utc(time)
      const localDate = utcDate.tz(tz)
      
      let label: string
      
      if (groupBy === 'hour') {
        // Format as "12 AM", "1 AM", "2 AM", ..., "11 PM" in user's local time
        const hours = localDate.hour()
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        label = `${displayHours} ${ampm}`
      } else {
        // Format as "Mon, Jan 15" for multiple days in user's local time
        const dayName = localDate.format('ddd')
        const monthDay = localDate.format('MMM D')
        label = `${dayName}, ${monthDay}`
      }

      return {
        time,
        count: dataMap.get(time) || 0,
        label,
      }
    })

    const total = data.reduce((sum, point) => sum + point.count, 0)

    return {
      success: true,
      data: {
        data,
        total,
      },
    }
  } catch (error) {
    console.error('Failed to get chart data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chart data',
    }
  }
}
