'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/admin'

export interface MaintenanceMode {
  enabled: boolean
  expected_time: string | null
  expected_hours: number | null
  updated_at: string | null
  message: string | null
}

/**
 * Get current maintenance mode status
 */
export async function getMaintenanceMode(): Promise<{ success: boolean; data?: MaintenanceMode; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('maintenance_mode')
      .select('enabled, expected_time, expected_hours, updated_at, message')
      .single()

    if (error) {
      console.error('Error fetching maintenance mode:', error)
      return { success: false, error: 'Failed to fetch maintenance mode' }
    }

    return {
      success: true,
      data: {
        enabled: data?.enabled ?? false,
        expected_time: data?.expected_time ?? null,
        expected_hours: data?.expected_hours ?? null,
        updated_at: data?.updated_at ?? null,
        message: data?.message ?? null,
      },
    }
  } catch (error) {
    console.error('Unexpected error fetching maintenance mode:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch maintenance mode',
    }
  }
}

/**
 * Update maintenance mode (admin only)
 */
export async function updateMaintenanceMode(
  enabled: boolean,
  expectedHours?: number | null,
  message?: string | null
): Promise<{ success: boolean; error?: string }> {
  // Verify admin
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' }
  }

  try {
    const supabase = await createClient()
    
    const updateData: any = {
      enabled,
      updated_at: new Date().toISOString(),
    }

    if (expectedHours !== undefined) {
      updateData.expected_hours = expectedHours
      // Calculate expected_time from updated_at + hours for backwards compatibility
      if (expectedHours && expectedHours > 0) {
        const now = new Date()
        const expected = new Date(now.getTime() + expectedHours * 60 * 60 * 1000)
        updateData.expected_time = expected.toISOString()
      } else {
        updateData.expected_time = null
      }
    }

    if (message !== undefined) {
      updateData.message = message
    }

    const { error } = await supabase
      .from('maintenance_mode')
      .update(updateData)
      .eq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error('Error updating maintenance mode:', error)
      return { success: false, error: 'Failed to update maintenance mode' }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating maintenance mode:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update maintenance mode',
    }
  }
}
