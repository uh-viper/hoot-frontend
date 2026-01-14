import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/domains/active - Get all active domains
// This endpoint is used by backend services to fetch active domains for email routing
export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all domains with status 'active'
    const { data: domains, error } = await supabase
      .from('domains')
      .select('id, domain_name, status, registrar, cloudflare_zone_id, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active domains', message: error.message },
        { status: 500 }
      )
    }

    // Return only the domain names as an array for easy consumption
    const domainNames = domains?.map((domain) => domain.domain_name) || []

    return NextResponse.json({
      success: true,
      domains: domainNames,
      count: domainNames.length,
      // Include full domain objects if needed
      full: domains || [],
    })
  } catch (err: any) {
    console.error('Unexpected error fetching active domains:', err)
    return NextResponse.json(
      { error: 'Internal server error', message: err.message },
      { status: 500 }
    )
  }
}
