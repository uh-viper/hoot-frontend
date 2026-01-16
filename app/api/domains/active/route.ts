import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/domains/active - Get all active domains
// This endpoint is used by backend services to fetch active domains for email routing
// Requires API key authentication via X-API-Key header
export async function GET(request: NextRequest) {
  try {
    // Check for API key in headers
    const apiKey = request.headers.get('X-API-Key')
    const expectedApiKey = process.env.FETCH_DOMAINS

    if (!expectedApiKey) {
      console.error('FETCH_DOMAINS environment variable not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing API key' },
        { status: 401 }
      )
    }

    // Use service role key to bypass RLS (domains table requires admin access)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

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

    // Return only the domain names as an array
    const domainNames = domains?.map((domain) => domain.domain_name) || []

    return NextResponse.json(domainNames)
  } catch (err: any) {
    console.error('Unexpected error fetching active domains:', err)
    return NextResponse.json(
      { error: 'Internal server error', message: err.message },
      { status: 500 }
    )
  }
}
