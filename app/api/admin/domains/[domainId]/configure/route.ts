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

      // Step 2: Clean up Porkbun DNS records and update nameservers
      // First, get and delete all existing DNS records from Porkbun
      const porkbunCleanupResult = await cleanupPorkbunDNS(domain.domain_name)
      if (porkbunCleanupResult.error) {
        console.warn('Porkbun DNS cleanup warning:', porkbunCleanupResult.error)
        // Don't fail - nameservers change will make these irrelevant anyway
      }

      // Then update Porkbun nameservers to Cloudflare nameservers
      const porkbunResult = await configurePorkbun(domain.domain_name, cloudflareResult.nameservers)
      results.porkbun = porkbunResult

      if (porkbunResult.error) {
        throw new Error(`Porkbun: ${porkbunResult.error}`)
      }

      // Step 3: Configure Cloudflare Email Routing
      // This automatically creates MX and DKIM records (they'll be "Read only" - managed by Cloudflare)
      const emailRoutingResult = await configureCloudflareEmailRouting(
        cloudflareResult.zoneId,
        domain.domain_name
      )
      if (emailRoutingResult.error && !emailRoutingResult.warning) {
        console.warn('Email routing warning:', emailRoutingResult.error)
      }

      // Step 4: Update DNS records in Cloudflare
      // Note: MX and DKIM records are automatically created by Email Routing (read-only)
      // We only need to create SPF record and other non-email records
      const dnsResult = await updateCloudflareDNS(
        cloudflareResult.zoneId,
        domain.domain_name
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
          // DNS records are managed by Cloudflare - no need to store them
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)

      // Return sanitized response (no sensitive data)
      // Include catchall debug info if it failed (will show in Vercel logs)
      const response: any = {
        success: true,
        message: 'Domain configured successfully',
        // Only return non-sensitive info - zone IDs and nameservers are public identifiers
        cloudflare: {
          zoneId: cloudflareResult.zoneId ? `${cloudflareResult.zoneId.slice(0, 8)}...` : null,
          nameservers: cloudflareResult.nameservers,
        },
        porkbun: {
          success: porkbunResult.success,
          nameservers: porkbunResult.nameservers,
        },
      }

      // If catchall configuration failed, include debug info in response
      if (emailRoutingResult && 'debug' in emailRoutingResult && emailRoutingResult.debug) {
        response.catchallDebug = emailRoutingResult.debug
        response.catchallError = emailRoutingResult.error
        // Log to console.error so it shows in Vercel logs
        console.error('CATCHALL CONFIG FAILED:', {
          error: emailRoutingResult.error,
          workerName: emailRoutingResult.debug.workerName,
          attempts: emailRoutingResult.debug.attempts?.length || 0,
          lastError: emailRoutingResult.debug.lastError,
        })
      }

      return NextResponse.json(response)
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

// Clean up Porkbun DNS records (get all and delete them)
async function cleanupPorkbunDNS(domain: string) {
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

    const requestBody = {
      secretapikey: porkbunSecretKey,
      apikey: porkbunApiKey,
    }

    // Step 1: Get all DNS records from Porkbun
    const getResponse = await fetch(
      `${apiEndpoint}/dns/retrieve/${encodeURIComponent(domain)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const contentType = getResponse.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await getResponse.text()
      console.error('Porkbun API returned non-JSON response:', textResponse.substring(0, 200))
      return { error: 'Failed to retrieve DNS records from Porkbun' }
    }

    const getData = await getResponse.json()

    if (getData.status !== 'SUCCESS' && getData.status !== 'success') {
      return { error: getData.message || 'Failed to retrieve DNS records' }
    }

    const records = getData.records || []
    const deletedRecords: string[] = []

    // Step 2: Delete each DNS record
    for (const record of records) {
      try {
        const deleteResponse = await fetch(
          `${apiEndpoint}/dns/delete/${encodeURIComponent(domain)}/${record.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        )

        const deleteData = await deleteResponse.json()
        if (deleteData.status === 'SUCCESS' || deleteData.status === 'success') {
          deletedRecords.push(record.id)
        }
      } catch (err) {
        console.warn(`Failed to delete record ${record.id}:`, err)
      }
    }

    return {
      success: true,
      totalRecords: records.length,
      deletedRecords: deletedRecords.length,
      message: `Deleted ${deletedRecords.length} of ${records.length} DNS records from Porkbun`,
    }
  } catch (err: any) {
    return { error: err.message || 'Failed to cleanup Porkbun DNS records' }
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
// Note: MX and DKIM records are automatically created by Cloudflare Email Routing (read-only)
// We only create SPF and other non-email DNS records here
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

    // Email routing DNS records
    // IMPORTANT: MX, DKIM, and SPF records are automatically created by Cloudflare Email Routing
    // They appear as "Read only" or "Auto" TTL in the dashboard because Cloudflare manages them
    // We should NOT create them manually to avoid duplicates
    
    // Check for existing SPF records for cleanup
    // Cloudflare Email Routing automatically creates SPF - we NEVER create it manually
    const existingSPF = getData.result?.filter((r: any) => 
      r.type === 'TXT' && 
      (r.name === '@' || r.name === domain) && 
      r.content && 
      (r.content.includes('v=spf1 include:_spf.mx.cloudflare.net') ||
       r.content === 'v=spf1 include:_spf.mx.cloudflare.net ~all' ||
       r.content === '"v=spf1 include:_spf.mx.cloudflare.net ~all"')
    ) || []

    // Default DNS records to create (if they don't exist)
    // NOTE: emailRecords is empty - we don't create SPF manually (Cloudflare does it)
    const defaultRecords = [
      { type: 'A', name: '@', content: '192.0.2.1', ttl: 3600 }, // Placeholder IP
      { type: 'CNAME', name: 'www', content: domain, ttl: 3600 },
      // NO SPF record - Cloudflare Email Routing creates it automatically
    ]

    const records = []

    // Clean up duplicate SPF records (keep only Cloudflare-managed one)
    // Cloudflare Email Routing creates SPF automatically - delete any manually created duplicates
    if (existingSPF.length > 1) {
      // Find Cloudflare-managed SPF (TTL = 1 or "auto" means Cloudflare manages it)
      const cloudflareManaged = existingSPF.find((r: any) => 
        r.ttl === 1 || r.ttl === 'auto' || r.ttl === 3600
      )
      
      // Keep Cloudflare-managed one, or if none found, keep the first one
      const toKeep = cloudflareManaged || existingSPF[0]
      
      // Delete all other SPF records (duplicates)
      for (const spfRecord of existingSPF) {
        if (spfRecord.id !== toKeep.id) {
          try {
            const deleteResponse = await fetch(
              `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${spfRecord.id}`,
              {
                method: 'DELETE',
                headers: authHeaders,
              }
            )
            const deleteData = await deleteResponse.json()
            if (deleteData.success) {
              console.log(`Deleted duplicate SPF record: ${spfRecord.id}`)
            }
          } catch (err) {
            console.warn(`Failed to delete duplicate SPF record ${spfRecord.id}:`, err)
          }
        }
      }
    }

    // Create/update DNS records
    // Skip MX records - they're auto-created by Email Routing (read-only)
    // Skip SPF if Cloudflare already created it
    for (const record of defaultRecords) {
      // Skip MX records - Cloudflare Email Routing creates these automatically
      if (record.type === 'MX') {
        continue
      }
      
      // Skip SPF records - Cloudflare Email Routing creates SPF automatically
      // We should NEVER create SPF manually to avoid duplicates
      if (record.type === 'TXT' && record.content && record.content.includes('v=spf1')) {
        continue
      }
      
      // For TXT records, check by type, name, and content
      const existing = getData.result?.find((r: any) => {
        if (r.type !== record.type || r.name !== record.name) return false
        if (record.type === 'TXT') {
          // Normalize content comparison (handle quotes)
          const recordContent = record.content.replace(/^"|"$/g, '')
          const existingContent = r.content.replace(/^"|"$/g, '')
          return existingContent === recordContent
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
    // Note: This may fail if nameservers haven't propagated yet (takes 2-3 minutes)
    const enableResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/enable`,
      {
        method: 'POST',
        headers: authHeaders,
      }
    )

    const enableData = await enableResponse.json()
    const emailRoutingEnabled = enableData.success || enableData.errors?.[0]?.code === 1004
    
    if (!emailRoutingEnabled) {
      console.warn('Email routing not ready yet (nameservers may still be propagating):', enableData.errors?.[0]?.message)
      // Return early - catchall can't be configured until email routing is enabled
      return {
        success: true,
        message: 'Domain configured. Email routing will be enabled once nameservers propagate (2-3 minutes).',
        note: 'Catchall configuration will need to be done manually in Cloudflare dashboard once email routing is ready, or reconfigure this domain after nameservers propagate.',
        emailRoutingPending: true,
      }
    }

    // Step 2: Email Routing automatically creates MX and DKIM records
    // These will appear as "Read only" in Cloudflare dashboard because Cloudflare manages them
    // We don't need to fetch or create them - they're auto-generated when Email Routing is enabled

    // Step 3: Configure catchall to send to worker
    // Extract worker name from URL (e.g., "https://bc-generator.xxx.workers.dev" -> "bc-generator")
    const workerName = workerUrl 
      ? workerUrl.replace(/^https?:\/\//, '').split('.')[0] 
      : 'bc-generator' // Default worker name

    if (!workerName) {
      console.warn('No worker name available for catchall configuration')
      return {
        success: true,
        message: 'Email routing enabled. MX and DKIM records are automatically created by Cloudflare (read-only).',
        note: 'EMAIL_FETCHER not set - configure catchall rule manually in Cloudflare dashboard.',
      }
    }

    // First, check current catchall status
    // Based on API docs: GET /zones/{zone_id}/email/routing/rules/catch_all
    const getCatchallResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules/catch_all`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    )
    const getCatchallData = await getCatchallResponse.json()

    // Based on Cloudflare API docs:
    // PUT /zones/{zone_id}/email/routing/rules/catch_all
    // CatchAllAction = { type, value }
    // CatchAllMatcher = { type }
    // The catchall rule has: { id, actions, enabled, matcher, name, tag }
    // Correct format based on successful tests (Format 3 worked!):
    // - matchers: array with { type: "all" }
    // - actions: array with { type: "worker", value: ["worker-name"] } - NOTE: value must be an array!
    // - enabled: true
    const catchallPayload = {
      matchers: [
        {
          type: 'all',
        },
      ],
      actions: [
        {
          type: 'worker',
          value: [workerName], // Value MUST be an array, not a string!
        },
      ],
      enabled: true,
    }

    // Based on API docs: PUT /zones/{zone_id}/email/routing/rules/catch_all
    const catchallResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules/catch_all`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(catchallPayload),
      }
    )

    const catchallData = await catchallResponse.json()

    if (!catchallData.success) {
      const lastError = catchallData.errors?.[0] || catchallData
      console.error('CATCHALL CONFIGURATION FAILED:', {
        error: lastError,
        workerName,
        zoneId: zoneId.slice(0, 8) + '...',
        payload: JSON.stringify(catchallPayload),
      })
      return {
        success: false,
        error: `Failed to configure catchall: ${lastError?.message || JSON.stringify(lastError)}`,
        warning: true,
      }
    }


    return {
      success: true,
      message: 'Email routing enabled. MX and DKIM records are automatically created by Cloudflare (read-only).',
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
