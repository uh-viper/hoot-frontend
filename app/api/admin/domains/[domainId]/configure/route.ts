import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{
    domainId: string
  }>
}

// POST /api/admin/domains/[domainId]/configure - Configure domain (DNS + Nameservers)
export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { domainId } = await params

  try {
    // Fetch domain from database
    const { data: domain, error: domainError } = await supabase
      .from('domains')
      .select('*')
      .eq('id', domainId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Update status to indicate configuration in progress
    await supabase
      .from('domains')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', domainId)

    const results = {
      cloudflare: null as any,
      porkbun: null as any,
      error: null as string | null,
    }

    try {
      // Step 1: Create Cloudflare zone (if not exists)
      const cloudflareResult = await configureCloudflare(domain.domain_name)
      results.cloudflare = cloudflareResult

      if (cloudflareResult.error || !cloudflareResult.zoneId || !cloudflareResult.nameservers) {
        throw new Error(`Cloudflare: ${cloudflareResult.error || 'Failed to get zone ID or nameservers'}`)
      }

      // Step 2: Update Porkbun nameservers to Cloudflare nameservers
      const porkbunResult = await configurePorkbun(domain.domain_name, cloudflareResult.nameservers)
      results.porkbun = porkbunResult

      if (porkbunResult.error) {
        throw new Error(`Porkbun: ${porkbunResult.error}`)
      }

      // Step 3: Update DNS records in Cloudflare
      const dnsResult = await updateCloudflareDNS(cloudflareResult.zoneId, domain.domain_name)
      if (dnsResult.error) {
        console.warn('DNS update warning:', dnsResult.error)
      }

      // Update domain in database with success
      await supabase
        .from('domains')
        .update({
          status: 'active',
          cloudflare_zone_id: cloudflareResult.zoneId,
          cloudflare_nameservers: cloudflareResult.nameservers,
          porkbun_nameservers: porkbunResult.nameservers || cloudflareResult.nameservers,
          dns_records: dnsResult.records || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)

      return NextResponse.json({
        success: true,
        message: 'Domain configured successfully',
        cloudflare: cloudflareResult,
        porkbun: porkbunResult,
      })
    } catch (configError: any) {
      // Update domain status to error
      await supabase
        .from('domains')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)

      return NextResponse.json(
        {
          error: configError.message || 'Failed to configure domain',
          details: results,
        },
        { status: 500 }
      )
    }
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Configure Cloudflare zone
async function configureCloudflare(domain: string): Promise<
  | { error: string; zoneId?: never; nameservers?: never }
  | { zoneId: string; nameservers: string[]; error?: never }
> {
  // Use global API key (requires API key + email) - SUPER SECURE, server-side only
  const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY
  const cloudflareEmail = process.env.CLOUDFLARE_EMAIL
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID

  if (!cloudflareApiKey || !cloudflareEmail || !cloudflareAccountId) {
    return { error: 'Cloudflare API credentials not configured' }
  }

  // Cloudflare global API key authentication uses X-Auth-Key and X-Auth-Email headers
  const authHeaders = {
    'X-Auth-Key': cloudflareApiKey,
    'X-Auth-Email': cloudflareEmail,
    'Content-Type': 'application/json',
  }

  try {
    // Check if zone already exists
    const checkResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    )

    const checkData = await checkResponse.json()

    let zoneId: string
    let nameservers: string[]

    if (checkData.success && checkData.result && checkData.result.length > 0) {
      // Zone exists
      zoneId = checkData.result[0].id
      nameservers = checkData.result[0].name_servers || []
    } else {
      // Create new zone
      const createResponse = await fetch('https://api.cloudflare.com/client/v4/zones', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: domain,
          account: { id: cloudflareAccountId },
        }),
      })

      const createData = await createResponse.json()

      if (!createData.success) {
        return {
          error: createData.errors?.[0]?.message || 'Failed to create Cloudflare zone',
        }
      }

      zoneId = createData.result.id
      nameservers = createData.result.name_servers || []
    }

    return {
      zoneId,
      nameservers,
    }
  } catch (err: any) {
    return { error: err.message || 'Cloudflare API error' }
  }
}

// Configure Porkbun nameservers
async function configurePorkbun(domain: string, nameservers: string[]) {
  const porkbunApiUrl = process.env.DOMAIN_API_URL
  const porkbunApiKey = process.env.DOMAIN_API_KEY
  const porkbunSecretKey = process.env.DOMAIN_API_SECRET

  if (!porkbunApiUrl || !porkbunApiKey || !porkbunSecretKey) {
    return { error: 'Porkbun API credentials not configured (need API URL, API key, and secret key)' }
  }

  try {
    // Porkbun API v3 requires both API key and secret API key
    // Endpoint: /api/json/v3/domain/updateNs/DOMAIN
    // Body: { secretapikey, apikey, ns: [array] }
    const requestBody: any = {
      secretapikey: porkbunSecretKey,
      apikey: porkbunApiKey,
      ns: nameservers, // Use 'ns' not 'nameservers' per API docs
    }

    // Ensure API URL is properly formatted
    let apiEndpoint = porkbunApiUrl.trim()
    // Remove trailing slash if present
    if (apiEndpoint.endsWith('/')) {
      apiEndpoint = apiEndpoint.slice(0, -1)
    }
    // Porkbun API v3 endpoint: /api/json/v3/domain/updateNs/DOMAIN
    const endpoint = `${apiEndpoint}/domain/updateNs/${encodeURIComponent(domain)}`

    // Update nameservers via Porkbun API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text()
      console.error('Porkbun API returned non-JSON response:', textResponse.substring(0, 200))
      return {
        error: `Porkbun API error: Received HTML response. Check API endpoint and credentials. Status: ${response.status}`,
      }
    }

    const data = await response.json()

    // Porkbun API typically returns status: "SUCCESS" or an error
    if (data.status !== 'SUCCESS' && data.status !== 'success') {
      return {
        error: data.message || data.error || 'Failed to update Porkbun nameservers',
      }
    }

    return {
      success: true,
      nameservers: nameservers,
    }
  } catch (err: any) {
    // Handle JSON parse errors specifically
    if (err.message && err.message.includes('JSON')) {
      return {
        error: `Porkbun API error: Invalid response format. Check API endpoint URL (${porkbunApiUrl}).`,
      }
    }
    return { error: err.message || 'Porkbun API error' }
  }
}

// Update Cloudflare DNS records
async function updateCloudflareDNS(zoneId: string, domain: string) {
  // Use global API key (requires API key + email) - SUPER SECURE, server-side only
  const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY
  const cloudflareEmail = process.env.CLOUDFLARE_EMAIL

  if (!cloudflareApiKey || !cloudflareEmail) {
    return { error: 'Cloudflare API credentials not configured' }
  }

  // Cloudflare global API key authentication uses X-Auth-Key and X-Auth-Email headers
  const authHeaders = {
    'X-Auth-Key': cloudflareApiKey,
    'X-Auth-Email': cloudflareEmail,
    'Content-Type': 'application/json',
  }

  try {
    // Get existing DNS records
    const getResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    )

    const getData = await getResponse.json()

    // Default DNS records to create (if they don't exist)
    const defaultRecords = [
      { type: 'A', name: '@', content: '192.0.2.1', ttl: 3600 }, // Placeholder IP
      { type: 'CNAME', name: 'www', content: domain, ttl: 3600 },
    ]

    const records = []

    // Create/update DNS records
    for (const record of defaultRecords) {
      const existing = getData.result?.find(
        (r: any) => r.type === record.type && r.name === record.name
      )

      if (existing) {
        records.push(existing)
        continue
      }

      const createResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(record),
        }
      )

      const createData = await createResponse.json()

      if (createData.success) {
        records.push(createData.result)
      }
    }

    return {
      records: records.map((r: any) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        content: r.content,
        ttl: r.ttl,
      })),
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to update DNS records' }
  }
}
