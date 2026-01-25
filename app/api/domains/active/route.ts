import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/domains/active - Get all active domains with aliases
// This endpoint is used by backend services to fetch active domains and their aliases
// Returns: [{ root_domain: "hootserv.onmicrosoft.com", aliases: ["hoot", "example1"] }]
// Backend can create accounts as: alias+random@root_domain (e.g., hoot+ttusudw4929_xyz@hootserv.onmicrosoft.com)
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

    // Fetch all domains with status 'active' including aliases
    const { data: domains, error } = await supabase
      .from('domains')
      .select('id, domain_name, aliases, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active domains', message: error.message },
        { status: 500 }
      )
    }

    // Return root domain and aliases for backend to create accounts
    // Format: [{ root_domain: "hootserv.onmicrosoft.com", aliases: ["hoot", "example1", "example2"] }]
    const domainsWithAliases = (domains || []).map((domain) => {
      // Parse aliases from JSON if stored as string
      const aliases = domain.aliases 
        ? (typeof domain.aliases === 'string' ? JSON.parse(domain.aliases) : domain.aliases)
        : []
      
      return {
        root_domain: domain.domain_name,
        aliases: aliases
      }
    })

    return NextResponse.json(domainsWithAliases)
  } catch (err: any) {
    console.error('Unexpected error fetching active domains:', err)
    return NextResponse.json(
      { error: 'Internal server error', message: err.message },
      { status: 500 }
    )
  }
}
