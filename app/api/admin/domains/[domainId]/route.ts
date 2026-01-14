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
    // Check if domain exists and get full details
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('id, domain_name, cloudflare_zone_id')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    const cleanupResults = {
      cloudflare: null as any,
      porkbun: null as any,
    }

    // Step 1: Delete Cloudflare zone if it exists
    if (domain.cloudflare_zone_id) {
      try {
        const cloudflareResult = await deleteCloudflareZone(domain.cloudflare_zone_id)
        cleanupResults.cloudflare = cloudflareResult
        if (cloudflareResult.error) {
          console.warn('Cloudflare zone deletion warning:', cloudflareResult.error)
        }
      } catch (err) {
        console.warn('Failed to delete Cloudflare zone:', err)
      }
    }

    // Step 2: Restore Porkbun nameservers to default
    try {
      const porkbunResult = await restorePorkbunNameservers(domain.domain_name)
      cleanupResults.porkbun = porkbunResult
      if (porkbunResult.error) {
        console.warn('Porkbun nameserver restoration warning:', porkbunResult.error)
      }
    } catch (err) {
      console.warn('Failed to restore Porkbun nameservers:', err)
    }

    // Step 3: Delete the domain from database
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
      cleanup: cleanupResults,
    })
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete Cloudflare zone
async function deleteCloudflareZone(zoneId: string) {
  const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY
  const cloudflareEmail = process.env.CLOUDFLARE_EMAIL

  if (!cloudflareApiKey || !cloudflareEmail) {
    return { error: 'Cloudflare API credentials not configured' }
  }

  const authHeaders = {
    'X-Auth-Key': cloudflareApiKey,
    'X-Auth-Email': cloudflareEmail,
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
      {
        method: 'DELETE',
        headers: authHeaders,
      }
    )

    const data = await response.json()

    if (!data.success) {
      return {
        error: data.errors?.[0]?.message || 'Failed to delete Cloudflare zone',
      }
    }

    return {
      success: true,
      message: 'Cloudflare zone deleted successfully',
    }
  } catch (err: any) {
    return { error: err.message || 'Cloudflare API error' }
  }
}

// Restore Porkbun nameservers to default
async function restorePorkbunNameservers(domain: string) {
  const porkbunApiUrl = process.env.DOMAIN_API_URL
  const porkbunApiKey = process.env.DOMAIN_API_KEY
  const porkbunSecretKey = process.env.DOMAIN_API_SECRET

  if (!porkbunApiUrl || !porkbunApiKey || !porkbunSecretKey) {
    return { error: 'Porkbun API credentials not configured' }
  }

  try {
    let apiEndpoint = porkbunApiUrl.trim()
    if (apiEndpoint.endsWith('/')) {
      apiEndpoint = apiEndpoint.slice(0, -1)
    }

    // Get current nameservers to see if we need to change them
    const getNsResponse = await fetch(
      `${apiEndpoint}/domain/getNs/${encodeURIComponent(domain)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretapikey: porkbunSecretKey,
          apikey: porkbunApiKey,
        }),
      }
    )

    const getNsData = await getNsResponse.json()

    // Default Porkbun nameservers
    const defaultPorkbunNameservers = [
      'curitiba.ns.porkbun.com',
      'fortaleza.ns.porkbun.com',
      'maceio.ns.porkbun.com',
      'salvador.ns.porkbun.com',
    ]

    // Check if nameservers are already Porkbun default
    const currentNs = getNsData.ns || []
    const isAlreadyPorkbun = currentNs.every((ns: string) =>
      defaultPorkbunNameservers.some((defaultNs) => ns.includes('porkbun.com'))
    )

    if (isAlreadyPorkbun) {
      return {
        success: true,
        message: 'Nameservers already set to Porkbun default',
      }
    }

    // Update nameservers to Porkbun default
    const updateResponse = await fetch(
      `${apiEndpoint}/domain/updateNs/${encodeURIComponent(domain)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretapikey: porkbunSecretKey,
          apikey: porkbunApiKey,
          ns: defaultPorkbunNameservers,
        }),
      }
    )

    const contentType = updateResponse.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await updateResponse.text()
      console.error('Porkbun API returned non-JSON response:', textResponse.substring(0, 200))
      return { error: 'Failed to restore Porkbun nameservers' }
    }

    const updateData = await updateResponse.json()

    if (updateData.status !== 'SUCCESS' && updateData.status !== 'success') {
      return {
        error: updateData.message || 'Failed to restore Porkbun nameservers',
      }
    }

    return {
      success: true,
      nameservers: defaultPorkbunNameservers,
      message: 'Porkbun nameservers restored successfully',
    }
  } catch (err: any) {
    return { error: err.message || 'Porkbun API error' }
  }
}
