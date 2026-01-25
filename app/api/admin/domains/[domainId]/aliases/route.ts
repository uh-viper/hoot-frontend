import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

// POST /api/admin/domains/[domainId]/aliases - Add an alias to a domain
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck

  try {
    const { domainId } = await params
    const body = await request.json()
    const { alias } = body

    if (!alias || typeof alias !== 'string') {
      return NextResponse.json({ error: 'Alias is required' }, { status: 400 })
    }

    // Validate alias format
    if (!/^[a-z0-9_-]+$/i.test(alias.trim())) {
      return NextResponse.json({ error: 'Invalid alias format. Aliases can only contain letters, numbers, hyphens, and underscores' }, { status: 400 })
    }

    // Get current domain
    const { data: domain, error: fetchError } = await supabase
      .from('domains')
      .select('aliases')
      .eq('id', domainId)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Parse existing aliases
    const currentAliases = domain.aliases 
      ? (typeof domain.aliases === 'string' ? JSON.parse(domain.aliases) : domain.aliases)
      : []

    // Check if alias already exists
    if (currentAliases.includes(alias.trim().toLowerCase())) {
      return NextResponse.json({ error: 'Alias already exists' }, { status: 409 })
    }

    // Add new alias
    const updatedAliases = [...currentAliases, alias.trim().toLowerCase()]

    // Update domain (pass array directly for JSONB)
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({ aliases: updatedAliases }) // Pass array directly - Supabase JSONB will handle it
      .eq('id', domainId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating domain:', updateError)
      return NextResponse.json({ error: 'Failed to add alias' }, { status: 500 })
    }

    return NextResponse.json({ 
      domain: {
        ...updatedDomain,
        aliases: updatedAliases
      },
      message: 'Alias added successfully' 
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/domains/[domainId]/aliases - Remove an alias from a domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ domainId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck

  try {
    const { domainId } = await params
    const body = await request.json()
    const { alias } = body

    if (!alias || typeof alias !== 'string') {
      return NextResponse.json({ error: 'Alias is required' }, { status: 400 })
    }

    // Get current domain
    const { data: domain, error: fetchError } = await supabase
      .from('domains')
      .select('aliases')
      .eq('id', domainId)
      .single()

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Parse existing aliases
    const currentAliases = domain.aliases 
      ? (typeof domain.aliases === 'string' ? JSON.parse(domain.aliases) : domain.aliases)
      : []

    // Remove alias
    const updatedAliases = currentAliases.filter((a: string) => a !== alias.trim().toLowerCase())

    // Update domain (pass array directly for JSONB)
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update({ aliases: updatedAliases }) // Pass array directly - Supabase JSONB will handle it
      .eq('id', domainId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating domain:', updateError)
      return NextResponse.json({ error: 'Failed to remove alias' }, { status: 500 })
    }

    return NextResponse.json({ 
      domain: {
        ...updatedDomain,
        aliases: updatedAliases
      },
      message: 'Alias removed successfully' 
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
