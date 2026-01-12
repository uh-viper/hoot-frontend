'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/validate-session'

export interface GraphDataPoint {
  time: string
  count: number
  label: string
}

export interface GraphData {
  data: GraphDataPoint[]
  total: number
  period: string
}

/**
 * Get Business Centers graph data for a time period
 */
export async function getBusinessCentersGraphData(
  period: 'today' | 'yesterday' | 'week' | 'month' | 'custom',
  startDate?: Date,
  endDate?: Date
): Promise<{ success: boolean; data?: GraphData; error?: string }> {
  const user = await getSessionUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  try {
    // Calculate date range based on period (using UTC)
    const now = new Date()
    let start: Date
    let end: Date = new Date(now)
    let groupBy: 'hour' | 'day' = 'hour'

    if (period === 'custom' && startDate && endDate) {
      // Normalize dates to UTC - create new dates with just year/month/day
      start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0))
      end = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999))
      
      console.log('[getBusinessCentersGraphData] Custom date range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        start: start.toISOString(),
        end: end.toISOString(),
      })
      
      // If custom range is more than 1 day, use daily grouping
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      groupBy = daysDiff > 1 ? 'day' : 'hour'
    } else if (period === 'today') {
      start = new Date(now)
      start.setUTCHours(0, 0, 0, 0)
      groupBy = 'hour'
    } else if (period === 'yesterday') {
      start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 1)
      start.setUTCHours(0, 0, 0, 0)
      end = new Date(start)
      end.setUTCHours(23, 59, 59, 999)
      groupBy = 'hour'
    } else if (period === 'week') {
      start = new Date(now)
      start.setUTCDate(start.getUTCDate() - 7)
      start.setUTCHours(0, 0, 0, 0)
      groupBy = 'day'
    } else if (period === 'month') {
      // Month-to-date: from 1st of current month to today
      start = new Date(now)
      start.setUTCDate(1) // First day of current month
      start.setUTCHours(0, 0, 0, 0)
      groupBy = 'day'
    } else {
      return { success: false, error: 'Invalid period' }
    }

    // Fetch all accounts in the date range
    const { data: accounts, error } = await supabase
      .from('user_accounts')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch accounts:', error)
      return { success: false, error: 'Failed to fetch account data' }
    }

    // Group accounts by time period
    const dataMap = new Map<string, number>()

    // Initialize all time slots with 0 (using UTC)
    const timeSlots: string[] = []
    if (groupBy === 'hour') {
      const current = new Date(start)
      const endTime = end.getTime()
      while (current.getTime() <= endTime) {
        const key = current.toISOString().slice(0, 13) + ':00:00' // YYYY-MM-DDTHH:00:00 (UTC)
        timeSlots.push(key)
        dataMap.set(key, 0)
        current.setUTCHours(current.getUTCHours() + 1)
      }
    } else {
      const current = new Date(start)
      const endDateStr = end.toISOString().slice(0, 10)
      while (current.getTime() <= end.getTime()) {
        const key = current.toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
        timeSlots.push(key)
        dataMap.set(key, 0)
        // Break if we've reached the end date
        if (key === endDateStr) break
        current.setUTCDate(current.getUTCDate() + 1)
      }
    }

    // Count accounts in each time slot (using UTC)
    accounts?.forEach((account) => {
      const createdAt = new Date(account.created_at)
      let key: string
      
      if (groupBy === 'hour') {
        // Round down to the hour using UTC
        const hourDate = new Date(createdAt)
        hourDate.setUTCMinutes(0, 0, 0)
        key = hourDate.toISOString().slice(0, 13) + ':00:00'
      } else {
        // Round down to the day using UTC
        key = createdAt.toISOString().slice(0, 10)
      }

      if (dataMap.has(key)) {
        dataMap.set(key, (dataMap.get(key) || 0) + 1)
      }
    })

    // Convert to array format (using UTC for labels, displayed in 24-hour format)
    const data: GraphDataPoint[] = timeSlots.map((time) => {
      // Parse the time string as UTC
      const date = new Date(time)
      let label: string
      
      if (groupBy === 'hour') {
        // Format as "3:00 PM" (12-hour format) using UTC
        const hours = date.getUTCHours()
        const minutes = date.getUTCMinutes().toString().padStart(2, '0')
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        label = `${displayHours}:${minutes} ${ampm}`
      } else {
        // Format as "Mon, Jan 15" using UTC
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
        const monthDay = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        })
        label = `${dayName}, ${monthDay}`
      }

      return {
        time,
        count: dataMap.get(time) || 0,
        label,
      }
    })

    const total = accounts?.length || 0

    return {
      success: true,
      data: {
        data,
        total,
        period: groupBy === 'hour' ? 'hourly' : 'daily',
      },
    }
  } catch (error) {
    console.error('Failed to get graph data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get graph data',
    }
  }
}
