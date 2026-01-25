import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    domainId: string
  }>
}

// PATCH /api/admin/domains/[domainId] - Update domain status
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { domainId } = await params

  try {
    const body = await request.json()
    const { status } = body

    if (!status || !['pending', 'active'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be pending or active' }, { status: 400 })
    }

    // Check if domain exists
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain_name')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Update status
    const { error: updateError } = await supabase
      .from('domains')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)

    if (updateError) {
      console.error('Error updating domain status:', updateError)
      return NextResponse.json({ error: 'Failed to update domain status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Domain status updated to ${status}`,
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
