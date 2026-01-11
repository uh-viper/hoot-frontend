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
  job_id: string;
  status: string;
  message?: string;
}

export interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_requested: number;
  total_created: number;
  accounts?: Array<{
    email: string;
    password: string;
  }>;
  error?: string;
  logs?: string[];
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
  const response = await fetch(`${API_BASE_URL}/api/create-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      accounts,
      region,
      currency,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create job' }));
    throw new Error(error.error || `HTTP ${response.status}: Failed to create job`);
  }

  return await response.json();
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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get job status' }));
    throw new Error(error.error || `HTTP ${response.status}: Failed to get job status`);
  }

  return await response.json();
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
