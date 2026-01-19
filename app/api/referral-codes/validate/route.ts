import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/referral-codes/validate?code=XXX - Validate a referral code (public endpoint)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ valid: false, error: 'Code is required' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    // Normalize code
    const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

    // Check if code exists and is active
    const { data: referralCode, error } = await supabase
      .from('referral_codes')
      .select('id, code, is_active')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single()

    if (error || !referralCode) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true, code: referralCode.code })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 })
  }
}
