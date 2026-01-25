import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/domains - List all domains
export async function GET() {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck

  try {
    const { data: domains, error } = await supabase
      .from('domains')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching domains:', error)
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 })
    }

    // Parse aliases from JSON if they exist
    const domainsWithAliases = (domains || []).map(domain => ({
      ...domain,
      aliases: domain.aliases ? (typeof domain.aliases === 'string' ? JSON.parse(domain.aliases) : domain.aliases) : []
    }))

    return NextResponse.json({ domains: domainsWithAliases })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/domains - Add a new domain
export async function POST(request: NextRequest) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase, user } = adminCheck

  try {
    const body = await request.json()
    const { domain, aliases } = body

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Domain name is required' }, { status: 400 })
    }

    // Validate .onmicrosoft.com domain format
    const domainRegex = /^[a-z0-9]+(-[a-z0-9]+)*\.onmicrosoft\.com$/i
    if (!domainRegex.test(domain.trim())) {
      return NextResponse.json({ error: 'Domain must be in format: example.onmicrosoft.com' }, { status: 400 })
    }

    // Check if domain already exists
    const { data: existing } = await supabase
      .from('domains')
      .select('id')
      .eq('domain_name', domain.trim().toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
    }

    // Validate aliases if provided
    const aliasesArray = Array.isArray(aliases) ? aliases : []
    for (const alias of aliasesArray) {
      if (typeof alias !== 'string' || !/^[a-z0-9_-]+$/i.test(alias)) {
        return NextResponse.json({ error: 'Invalid alias format. Aliases can only contain letters, numbers, hyphens, and underscores' }, { status: 400 })
      }
    }

    // Insert new domain with aliases stored as JSON
    const { data: newDomain, error } = await supabase
      .from('domains')
      .insert({
        domain_name: domain.trim().toLowerCase(),
        aliases: aliasesArray.length > 0 ? JSON.stringify(aliasesArray) : JSON.stringify([]),
        registrar: 'microsoft',
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding domain:', error)
      return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
    }

    // Parse aliases for response
    const domainWithAliases = {
      ...newDomain,
      aliases: aliasesArray
    }

    return NextResponse.json({ domain: domainWithAliases, message: 'Domain added successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
