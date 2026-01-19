import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'

// GET /api/admin/referral-codes - List all referral codes
export async function GET() {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck

  try {
    const { data: referralCodes, error } = await supabase
      .from('referral_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching referral codes:', error)
      return NextResponse.json({ error: 'Failed to fetch referral codes' }, { status: 500 })
    }

    // Get usage count for each referral code
    const codesWithUsage = await Promise.all(
      (referralCodes || []).map(async (code) => {
        const { count } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referral_code', code.code)

        return {
          ...code,
          usage_count: count || 0,
        }
      })
    )

    return NextResponse.json({ referralCodes: codesWithUsage })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/referral-codes - Create a new referral code
export async function POST(request: NextRequest) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase, user } = adminCheck

  try {
    const body = await request.json()
    const { code, description } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Referral code is required' }, { status: 400 })
    }

    // Normalize code (uppercase, alphanumeric only)
    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

    if (normalizedCode.length < 3) {
      return NextResponse.json({ error: 'Referral code must be at least 3 characters' }, { status: 400 })
    }

    if (normalizedCode.length > 20) {
      return NextResponse.json({ error: 'Referral code must be 20 characters or less' }, { status: 400 })
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', normalizedCode)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Referral code already exists' }, { status: 409 })
    }

    // Insert new referral code
    const { data: newCode, error } = await supabase
      .from('referral_codes')
      .insert({
        code: normalizedCode,
        description: description?.trim() || null,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding referral code:', error)
      return NextResponse.json({ error: 'Failed to add referral code' }, { status: 500 })
    }

    return NextResponse.json({ referralCode: newCode, message: 'Referral code created successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
