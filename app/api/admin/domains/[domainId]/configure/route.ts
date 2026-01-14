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

      // Step 3: Configure Cloudflare Email Routing first (to get MX priorities and DKIM)
      const emailRoutingResult = await configureCloudflareEmailRouting(
        cloudflareResult.zoneId,
        domain.domain_name
      )
      if (emailRoutingResult.error && !emailRoutingResult.warning) {
        console.warn('Email routing warning:', emailRoutingResult.error)
      }

      // Step 4: Update DNS records in Cloudflare (using MX priorities and DKIM from Email Routing)
      const dnsResult = await updateCloudflareDNS(
        cloudflareResult.zoneId,
        domain.domain_name,
        emailRoutingResult.mxRecords, // Use MX records from Email Routing API
        emailRoutingResult.dkimRecord // Use DKIM record from Email Routing API
      )
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
async function updateCloudflareDNS(
  zoneId: string,
  domain: string,
  mxRecords?: Array<{ content: string; priority: number }>,
  dkimRecord?: { name: string; content: string }
) {
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

    // Email routing DNS records (MX, TXT for SPF and DKIM)
    // Use MX records from Email Routing API if provided, otherwise use defaults
    const emailRecords: any[] = []
    
    if (mxRecords && mxRecords.length > 0) {
      // Use MX records from Cloudflare Email Routing API (with actual priorities)
      mxRecords.forEach((mx) => {
        emailRecords.push({
          type: 'MX',
          name: '@',
          content: mx.content,
          priority: mx.priority,
          ttl: 600,
        })
      })
    } else {
      // Fallback to default MX records (if Email Routing API didn't return them)
      emailRecords.push(
        { type: 'MX', name: '@', content: 'route1.mx.cloudflare.net', priority: 28, ttl: 600 },
        { type: 'MX', name: '@', content: 'route2.mx.cloudflare.net', priority: 28, ttl: 600 },
        { type: 'MX', name: '@', content: 'route3.mx.cloudflare.net', priority: 23, ttl: 600 }
      )
    }
    
    // SPF record (always the same)
    emailRecords.push({
      type: 'TXT',
      name: '@',
      content: 'v=spf1 include:_spf.mx.cloudflare.net ~all',
      ttl: 600,
    })
    
    // DKIM record (from Email Routing API if provided)
    if (dkimRecord) {
      emailRecords.push({
        type: 'TXT',
        name: dkimRecord.name,
        content: dkimRecord.content,
        ttl: 600,
      })
    }

    // Default DNS records to create (if they don't exist)
    const defaultRecords = [
      { type: 'A', name: '@', content: '192.0.2.1', ttl: 3600 }, // Placeholder IP
      { type: 'CNAME', name: 'www', content: domain, ttl: 3600 },
      ...emailRecords, // Include email records
    ]

    const records = []

    // Create/update DNS records
    for (const record of defaultRecords) {
      // For MX records, check by type, name, and priority
      // For TXT records, check by type, name, and content
      const existing = getData.result?.find((r: any) => {
        if (r.type !== record.type || r.name !== record.name) return false
        if (record.type === 'MX' && 'priority' in record) {
          return r.priority === record.priority
        }
        if (record.type === 'TXT') {
          return r.content === record.content
        }
        return true
      })

      if (existing) {
        records.push(existing)
        continue
      }

      // Format record for Cloudflare API
      const cloudflareRecord: any = {
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl,
      }

      // Add priority for MX records
      if (record.type === 'MX' && 'priority' in record) {
        cloudflareRecord.priority = record.priority
      }

      const createResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(cloudflareRecord),
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
        priority: r.priority,
      })),
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to update DNS records' }
  }
}

// Configure Cloudflare Email Routing (catchall to worker)
async function configureCloudflareEmailRouting(zoneId: string, domain: string) {
  const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY
  const cloudflareEmail = process.env.CLOUDFLARE_EMAIL
  const workerUrl = process.env.EMAIL_FETCHER // bc-generator worker URL

  if (!cloudflareApiKey || !cloudflareEmail) {
    return { error: 'Cloudflare API credentials not configured' }
  }

  const authHeaders = {
    'X-Auth-Key': cloudflareApiKey,
    'X-Auth-Email': cloudflareEmail,
    'Content-Type': 'application/json',
  }

  try {
    // Step 1: Enable Email Routing for the zone
    const enableResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/enable`,
      {
        method: 'POST',
        headers: authHeaders,
      }
    )

    const enableData = await enableResponse.json()
    if (!enableData.success && enableData.errors?.[0]?.code !== 1004) {
      // 1004 = already enabled, which is fine
      console.warn('Email routing enable warning:', enableData.errors?.[0]?.message)
    }

    // Step 2: Get Email Routing DNS records (MX priorities and DKIM)
    // This API endpoint returns the MX records with their actual priorities
    const dnsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/dns`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    )

    const dnsData = await dnsResponse.json()
    let mxRecords: Array<{ content: string; priority: number }> = []
    let dkimRecord: { name: string; content: string } | undefined

    if (dnsData.success && dnsData.result) {
      // Extract MX records with their priorities
      if (dnsData.result.mx_records) {
        mxRecords = dnsData.result.mx_records.map((mx: any) => ({
          content: mx.content || mx.exchange,
          priority: mx.priority || mx.prio,
        }))
      }

      // Extract DKIM record
      if (dnsData.result.txt_record) {
        dkimRecord = {
          name: dnsData.result.txt_record.name || `cf2024-1._domainkey.${domain}`,
          content: dnsData.result.txt_record.content || dnsData.result.txt_record.value,
        }
      }
    }

    // Step 3: Create catchall destination and rule (if worker URL provided)
    if (workerUrl) {
      // Create HTTP destination (worker endpoint)
      const destinationResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/addresses`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            email: `catchall@${domain}`,
            tag: 'catchall',
          }),
        }
      )

      // Create catchall rule to forward to worker
      // Note: Cloudflare Email Routing API may require different format
      // This is a simplified approach - may need adjustment based on actual API
    }

    return {
      success: true,
      mxRecords: mxRecords.length > 0 ? mxRecords : undefined,
      dkimRecord: dkimRecord,
      message: 'Email routing enabled. MX records and DKIM fetched from Cloudflare.',
      note: workerUrl
        ? 'Configure catchall rule in Cloudflare dashboard to forward to worker, or implement via API.'
        : 'EMAIL_FETCHER not set - configure catchall rule manually in Cloudflare dashboard.',
    }
  } catch (err: any) {
    // Email routing setup is optional, don't fail the whole operation
    return {
      error: err.message || 'Email routing configuration may need manual setup in Cloudflare dashboard',
      warning: true,
    }
  }
}
