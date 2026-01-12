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
    // Calculate date range based on period
    const now = new Date()
    let start: Date
    let end: Date = new Date(now)
    let groupBy: 'hour' | 'day' = 'hour'

    if (period === 'custom' && startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
      // If custom range is more than 1 day, use daily grouping
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      groupBy = daysDiff > 1 ? 'day' : 'hour'
    } else if (period === 'today') {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
      groupBy = 'hour'
    } else if (period === 'yesterday') {
      start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setHours(23, 59, 59, 999)
      groupBy = 'hour'
    } else if (period === 'week') {
      start = new Date(now)
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      groupBy = 'day'
    } else if (period === 'month') {
      start = new Date(now)
      start.setMonth(start.getMonth() - 1)
      start.setHours(0, 0, 0, 0)
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

    // Initialize all time slots with 0
    const timeSlots: string[] = []
    if (groupBy === 'hour') {
      const current = new Date(start)
      while (current <= end) {
        const key = current.toISOString().slice(0, 13) + ':00:00' // YYYY-MM-DDTHH:00:00
        timeSlots.push(key)
        dataMap.set(key, 0)
        current.setHours(current.getHours() + 1)
      }
    } else {
      const current = new Date(start)
      while (current <= end) {
        const key = current.toISOString().slice(0, 10) // YYYY-MM-DD
        timeSlots.push(key)
        dataMap.set(key, 0)
        current.setDate(current.getDate() + 1)
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
        // Format as "15:00" (24-hour military time) using UTC
        const hours = date.getUTCHours().toString().padStart(2, '0')
        const minutes = date.getUTCMinutes().toString().padStart(2, '0')
        label = `${hours}:${minutes}`
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
