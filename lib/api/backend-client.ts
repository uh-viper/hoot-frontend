/**
 * Backend API Client
 * Handles communication with api.hootservices.com
 * 
 * IMPORTANT: This file should ONLY be imported in server-side code (server actions, API routes)
 * Uses JWT authentication from Supabase Auth - token must be passed from server actions
 * 
 * Authentication:
 * - Uses JWT tokens from Supabase Auth (session.access_token)
 * - Sends token in Authorization: Bearer <token> header
 * - Backend must validate the JWT:
 *   - For HS256 (legacy): Use Supabase's JWT secret
 *   - For ES256 (modern default): Use Supabase's JWKS endpoint:
 *     https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
 * - Modern Supabase projects use ES256 (ECC P-256) by default
 */

// API_BASE_URL can be public (just the domain)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.hootservices.com';

export interface CreateJobRequest {
  accounts: number;
  region: string;
  currency: string;
}

export interface CreateJobResponse {
  success: boolean;
  job_id: string;
  message?: string;
  error?: string;
  details?: Record<string, string[]>;
}

export interface JobStatus {
  success: boolean;
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_requested: number;
  total_created: number;
  total_failed?: number;
  duration?: number;
  accounts?: Array<{
    email: string;
    password: string;
    region?: string;
    currency?: string;
  }>;
  failures?: Array<{
    email: string;
    code: string;
  }>;
  error?: string;
}

export interface Region {
  code: string;
  country: string;
  currency: string;
}

/**
 * Create a new accounts job
 * @param accounts - Number of accounts to create
 * @param region - Region code (e.g., 'US')
 * @param currency - Currency code (e.g., 'USD')
 * @param token - JWT token from Supabase Auth session
 */
export async function createAccountsJob(
  accounts: number,
  region: string,
  currency: string,
  token: string
): Promise<CreateJobResponse> {
  if (!token) {
    throw new Error('Authentication required - JWT token is missing');
  }

  const payload = {
    accounts,
    region,
    currency,
  };
  
  // Validate token format (should be a JWT)
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    console.error('[createAccountsJob] Invalid token format - expected JWT with 3 parts');
    throw new Error('Invalid authentication token format');
  }
  
  // Decode JWT header to log algorithm for debugging
  // Note: Supabase now uses ES256 (ECC P-256) by default for new projects
  // Legacy projects may still use HS256
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length >= 1) {
      const headerBase64 = tokenParts[0].replace(/-/g, '+').replace(/_/g, '/');
      const headerJson = Buffer.from(headerBase64, 'base64').toString('utf-8');
      const header = JSON.parse(headerJson);
      
      console.log('[createAccountsJob] Token algorithm:', header.alg);
      console.log('[createAccountsJob] Token type:', header.typ || 'not in header');
      
      // Note: Both HS256 and ES256 are valid Supabase algorithms
      // ES256 is the modern default, HS256 is legacy
      // Backend must validate using the appropriate method:
      // - HS256: Use JWT secret
      // - ES256: Use JWKS endpoint (https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json)
    }
  } catch (e) {
    console.warn('[createAccountsJob] Could not decode token header:', e);
    // Continue anyway - let backend validate
  }
  
  console.log('[createAccountsJob] Sending request to:', `${API_BASE_URL}/api/create-accounts`);
  console.log('[createAccountsJob] Request payload:', payload);
  console.log('[createAccountsJob] Token length:', token.length);
  console.log('[createAccountsJob] Token preview:', token.substring(0, 20) + '...');
  
  const response = await fetch(`${API_BASE_URL}/api/create-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  // Handle 401 Unauthorized (token expired/invalid)
  if (response.status === 401) {
    const errorMsg = 'Authentication failed. Please log in again.';
    console.error('[createAccountsJob] Authentication failed (401)');
    throw new Error(errorMsg);
  }

  const result = await response.json();
  console.log('[createAccountsJob] API response:', result);

  // Check if API returned an error (even with 200 status)
  if (!result.success) {
    const errorMsg = result.error || result.message || 'Failed to create job';
    console.error('[createAccountsJob] API returned error:', result);
    throw new Error(errorMsg);
  }

  // Check HTTP status code
  if (!response.ok) {
    const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to create job`;
    console.error('[createAccountsJob] HTTP error:', { status: response.status, result });
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Get job status
 * @param jobId - Job ID to check status for
 * @param token - JWT token from Supabase Auth session
 */
export async function getJobStatus(jobId: string, token: string): Promise<JobStatus> {
  if (!token) {
    throw new Error('Authentication required - JWT token is missing');
  }

  const response = await fetch(`${API_BASE_URL}/api/job/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // Handle 401 Unauthorized (token expired/invalid)
  if (response.status === 401) {
    const errorMsg = 'Authentication failed. Please log in again.';
    console.error('[getJobStatus] Authentication failed (401):', jobId);
    throw new Error(errorMsg);
  }

  const result = await response.json();
  console.log('[getJobStatus] API response:', { jobId, result });

  // Check if API returned an error (even with 200 status)
  if (!result.success) {
    const errorMsg = result.error || result.message || 'Failed to get job status';
    console.error('[getJobStatus] API returned error:', { jobId, result });
    throw new Error(errorMsg);
  }

  // Check HTTP status code
  if (!response.ok) {
    const errorMsg = result.error || result.message || `HTTP ${response.status}: Failed to get job status`;
    console.error('[getJobStatus] HTTP error:', { status: response.status, jobId, result });
    throw new Error(errorMsg);
  }

  return result;
}

/**
 * Get available regions
 */
export async function getRegions(): Promise<{ regions: Region[] }> {
  const response = await fetch(`${API_BASE_URL}/api/regions`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to get regions`);
  }

  return await response.json();
}

/**
 * Check API health status
 */
export async function checkHealth(): Promise<{ status: string; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: API health check failed`);
  }

  return await response.json();
}
