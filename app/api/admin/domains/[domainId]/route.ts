import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    domainId: string
  }>
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

    // Delete the domain
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
      message: `Domain ${domain.domain_name} deleted successfully` 
    })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
