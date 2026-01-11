/**
 * Backend API Client
 * Handles communication with api.hootservices.com
 * 
 * IMPORTANT: This file should ONLY be imported in server-side code (server actions, API routes)
 * Never import this in client components - it contains the API key!
 */

// API_BASE_URL can be public (just the domain)
// But we default to the known URL if not set
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.hootservices.com';
// API_KEY is server-side only (no NEXT_PUBLIC_ prefix) - never exposed to browser
const API_KEY = process.env.API_KEY || process.env.BACKEND_API_KEY || '';

if (!API_KEY) {
  console.warn('⚠️  API_KEY not set - backend API calls will fail');
}

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
    error: string;
    code?: string;
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
 */
export async function createAccountsJob(
  accounts: number,
  region: string,
  currency: string
): Promise<CreateJobResponse> {
  const payload = {
    accounts,
    region,
    currency,
  };
  
  console.log('[createAccountsJob] Sending request to:', `${API_BASE_URL}/api/create-accounts`);
  console.log('[createAccountsJob] Request payload:', payload);
  console.log('[createAccountsJob] API_KEY set:', !!API_KEY);
  
  const response = await fetch(`${API_BASE_URL}/api/create-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(payload),
  });

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
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE_URL}/api/job/${jobId}`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });

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
