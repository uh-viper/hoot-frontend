import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'

// DELETE /api/admin/referral-codes/[codeId] - Delete a referral code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { codeId } = await params

  try {
    // Check if code exists
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('id, code')
      .eq('id', codeId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 })
    }

    // Delete the referral code
    const { error } = await supabase
      .from('referral_codes')
      .delete()
      .eq('id', codeId)

    if (error) {
      console.error('Error deleting referral code:', error)
      return NextResponse.json({ error: 'Failed to delete referral code' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Referral code deleted successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/referral-codes/[codeId] - Update a referral code (toggle active status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { codeId } = await params

  try {
    const body = await request.json()
    const { is_active, description, free_credits } = body

    // Check if code exists
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('id', codeId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 })
    }

    // Validate free_credits if provided
    if (free_credits !== undefined) {
      if (typeof free_credits !== 'number' || free_credits < 0 || free_credits > 1000000) {
        return NextResponse.json({ error: 'Free credits must be a number between 0 and 1,000,000' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: { is_active?: boolean; description?: string | null; free_credits?: number } = {}
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active
    }
    if (typeof description === 'string') {
      updateData.description = description.trim() || null
    }
    if (typeof free_credits === 'number') {
      updateData.free_credits = Math.floor(free_credits) // Ensure integer
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update the referral code
    const { data: updatedCode, error } = await supabase
      .from('referral_codes')
      .update(updateData)
      .eq('id', codeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating referral code:', error)
      return NextResponse.json({ error: 'Failed to update referral code' }, { status: 500 })
    }

    return NextResponse.json({ referralCode: updatedCode, message: 'Referral code updated successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
