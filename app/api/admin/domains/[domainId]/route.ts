import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    domainId: string
  }>
}

// PATCH /api/admin/domains/[domainId] - Update domain (status or root domain)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { domainId } = await params

  try {
    const body = await request.json()
    const { status, domain, aliases } = body

    // Check if domain exists
    const { data: existingDomain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain_name, aliases')
      .eq('id', domainId)
      .single()

    if (domainError || !existingDomain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Update status if provided
    if (status && ['pending', 'active'].includes(status)) {
      updateData.status = status
    }

    // Update root domain if provided
    if (domain && typeof domain === 'string') {
      // Validate .onmicrosoft.com domain format
      const domainRegex = /^[a-z0-9]+(-[a-z0-9]+)*\.onmicrosoft\.com$/i
      if (!domainRegex.test(domain.trim())) {
        return NextResponse.json({ error: 'Domain must be in format: example.onmicrosoft.com' }, { status: 400 })
      }
      updateData.domain_name = domain.trim().toLowerCase()
    }

    // Update aliases if provided
    if (aliases && Array.isArray(aliases)) {
      // Validate aliases
      for (const alias of aliases) {
        if (typeof alias !== 'string' || !/^[a-z0-9_-]+$/i.test(alias)) {
          return NextResponse.json({ error: 'Invalid alias format. Aliases can only contain letters, numbers, hyphens, and underscores' }, { status: 400 })
        }
      }
      updateData.aliases = JSON.stringify(aliases)
    }

    // Update domain
    const { data: updatedDomain, error: updateError } = await supabase
      .from('domains')
      .update(updateData)
      .eq('id', domainId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating domain:', updateError)
      return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 })
    }

    // Parse aliases for response
    const domainWithAliases = {
      ...updatedDomain,
      aliases: updatedDomain.aliases 
        ? (typeof updatedDomain.aliases === 'string' ? JSON.parse(updatedDomain.aliases) : updatedDomain.aliases)
        : []
    }

    return NextResponse.json({
      success: true,
      domain: domainWithAliases,
      message: status ? `Domain status updated to ${status}` : 'Domain updated successfully',
    })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/domains/[domainId] - Delete a domain
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { domainId } = await params

  try {
    // Check if domain exists
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain_name')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Delete the domain from database
    const { error: deleteError } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)

    if (deleteError) {
      console.error('Error deleting domain:', deleteError)
      return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Domain ${domain.domain_name} deleted successfully`,
    })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
