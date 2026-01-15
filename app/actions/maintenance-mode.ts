'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/auth/admin'

export interface MaintenanceMode {
  enabled: boolean
  expected_time: string | null
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
      .select('enabled, expected_time, message')
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
  expectedTime?: string | null,
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

    if (expectedTime !== undefined) {
      updateData.expected_time = expectedTime
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
