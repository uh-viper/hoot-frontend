'use server'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { localDateRangeToUTC, getUserTimezone } from '@/lib/utils/date-timezone'

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
    let start: string | undefined
    let end: string | undefined
    let groupBy: 'hour' | 'day' = 'hour'

    console.log('[CHART-DATA] Input params:', {
      statType,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      userTimezone,
    })

    if (startDate && endDate) {
      // Check if start and end are the same calendar day (in user's local timezone)
      const tz = userTimezone || getUserTimezone()
      const startDay = dayjs(startDate).tz(tz).format('YYYY-MM-DD')
      const endDay = dayjs(endDate).tz(tz).format('YYYY-MM-DD')
      const isSameDay = startDay === endDay
      
      console.log('[CHART-DATA] Local date check:', {
        tz,
        startDay,
        endDay,
        isSameDay,
        startDateLocal: dayjs(startDate).tz(tz).format('YYYY-MM-DD HH:mm:ss'),
        endDateLocal: dayjs(endDate).tz(tz).format('YYYY-MM-DD HH:mm:ss'),
      })
      
      // Convert local dates to UTC for database queries using timezone utility
      // This properly converts local time to UTC (same as stats cards)
      const utcRange = localDateRangeToUTC(startDate, endDate, userTimezone)
      
      start = utcRange.start.toISOString()
      end = utcRange.end.toISOString()
      
      console.log('[CHART-DATA] UTC conversion:', {
        localStart: startDate.toISOString(),
        localEnd: endDate.toISOString(),
        utcStart: start,
        utcEnd: end,
      })
      
      groupBy = isSameDay ? 'hour' : 'day'
    } else {
      // For "All Time", fetch all jobs and determine range from actual data
      // We'll fetch all jobs and then determine the date range from the data itself
      start = undefined
      end = undefined
      groupBy = 'day'
      
      console.log('[CHART-DATA] No date range provided (All Time), will fetch all jobs')
    }

    console.log('[CHART-DATA] Final query params:', {
      start,
      end,
      groupBy,
    })

    // Fetch user jobs in the date range
    let jobsQuery = supabase
      .from('user_jobs')
      .select('created_at, requested_count, successful_count, failed_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (start && end) {
      jobsQuery = jobsQuery.gte('created_at', start).lte('created_at', end)
    }
    
    const { data: jobs, error } = await jobsQuery

    console.log('[CHART-DATA] Database query results:', {
      jobsCount: jobs?.length || 0,
      jobs: jobs?.map(j => ({
        created_at: j.created_at,
        requested: j.requested_count,
        successful: j.successful_count,
        failed: j.failed_count,
        created_at_local: j.created_at ? dayjs.utc(j.created_at).tz(userTimezone || getUserTimezone()).format('YYYY-MM-DD HH:mm:ss') : null,
      })),
      error: error?.message,
    })

    if (error) {
      console.error('[CHART-DATA] Failed to fetch jobs:', error)
      return { success: false, error: 'Failed to fetch job data' }
    }

    // Group jobs by time period
    const dataMap = new Map<string, number>()

    // Initialize all time slots with 0
    // Generate time slots based on LOCAL date range, not UTC range
    // This ensures we show the correct hours/days for the user's selected range
    const timeSlots: string[] = []
    const tzForSlots = userTimezone || getUserTimezone()
    
    if (groupBy === 'hour' && startDate && endDate) {
      // For hourly grouping, generate slots for the local day (00:00 to 23:00)
      const localStart = dayjs(startDate).tz(tzForSlots).startOf('day')
      for (let hour = 0; hour < 24; hour++) {
        const slotTime = localStart.add(hour, 'hour')
        // Convert to UTC for the key (used for matching with database timestamps)
        const key = slotTime.utc().toISOString().slice(0, 13) + ':00:00'
        timeSlots.push(key)
        dataMap.set(key, 0)
      }
    } else if (groupBy === 'day' && startDate && endDate) {
      // For daily grouping, generate slots for each day in the local range
      const localStart = dayjs(startDate).tz(tzForSlots).startOf('day')
      const localEnd = dayjs(endDate).tz(tzForSlots).startOf('day')
      let current = localStart
      while (current.isSame(localEnd, 'day') || current.isBefore(localEnd, 'day')) {
        // Convert to UTC for the key (used for matching with database timestamps)
        const key = current.utc().toISOString().slice(0, 10)
        timeSlots.push(key)
        dataMap.set(key, 0)
        current = current.add(1, 'day')
      }
    } else if (jobs && jobs.length > 0) {
      // For "All Time" or when no date range provided, generate slots from actual job dates
      // Convert each job's UTC timestamp to local time, then generate slots for those days
      const jobDates = new Set<string>()
      
      jobs.forEach((job) => {
        // Convert UTC timestamp to local time, then get the date
        const localDate = dayjs.utc(job.created_at).tz(tzForSlots).startOf('day')
        const dateKey = localDate.format('YYYY-MM-DD')
        jobDates.add(dateKey)
      })
      
      // Sort dates and generate time slots
      const sortedDates = Array.from(jobDates).sort()
      if (sortedDates.length > 0) {
        const firstDate = dayjs.tz(sortedDates[0], tzForSlots).startOf('day')
        const lastDate = dayjs.tz(sortedDates[sortedDates.length - 1], tzForSlots).startOf('day')
        
        let current = firstDate
        while (current.isSame(lastDate, 'day') || current.isBefore(lastDate, 'day')) {
          // Convert to UTC for the key (used for matching with database timestamps)
          const key = current.utc().toISOString().slice(0, 10)
          timeSlots.push(key)
          dataMap.set(key, 0)
          current = current.add(1, 'day')
        }
      }
    }

    // Sum up the selected stat type for each time slot
    // IMPORTANT: Convert job UTC timestamps to local time before mapping to slots
    console.log('[CHART-DATA] Time slots generated:', {
      count: timeSlots.length,
      firstFew: timeSlots.slice(0, 5),
      lastFew: timeSlots.slice(-5),
    })

    const tzForMapping = userTimezone || getUserTimezone()

    jobs?.forEach((job) => {
      // Convert UTC timestamp to local time first
      const jobLocalTime = dayjs.utc(job.created_at).tz(tzForMapping)
      let key: string
      
      if (groupBy === 'hour') {
        // For hourly grouping, round down to the hour in local time, then convert to UTC key
        const hourLocal = jobLocalTime.startOf('hour')
        key = hourLocal.utc().toISOString().slice(0, 13) + ':00:00'
      } else {
        // For daily grouping, get the date in local time, then convert to UTC key
        const dayLocal = jobLocalTime.startOf('day')
        key = dayLocal.utc().toISOString().slice(0, 10)
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
        const oldValue = dataMap.get(key) || 0
        dataMap.set(key, oldValue + value)
        
        console.log('[CHART-DATA] Mapped job to time slot:', {
          jobCreatedAtUTC: job.created_at,
          jobCreatedAtLocal: jobLocalTime.format('YYYY-MM-DD HH:mm:ss'),
          key,
          value,
          oldValue,
          newValue: oldValue + value,
        })
      } else {
        console.log('[CHART-DATA] Job key not found in time slots:', {
          jobCreatedAtUTC: job.created_at,
          jobCreatedAtLocal: jobLocalTime.format('YYYY-MM-DD HH:mm:ss'),
          key,
          availableKeys: timeSlots.slice(0, 10),
        })
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
