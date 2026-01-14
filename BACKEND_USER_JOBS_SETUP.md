# Backend User Jobs Setup - Migration from user_stats

## ✅ What Changed

**We've migrated from `user_stats` table to `user_jobs` table!**

### Why the Change:
- `user_stats` was a single row per user with cumulative totals
- Couldn't filter stats by date range accurately
- `user_jobs` tracks each individual job request with timestamps
- Enables accurate date filtering and better analytics

## Database Schema

### New Table: `user_jobs`

```sql
CREATE TABLE public.user_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_id TEXT NOT NULL UNIQUE,  -- External job ID from backend
  requested_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Removed Table: `user_stats`
- ❌ No longer exists
- All stats are now calculated from `user_jobs` table

## Backend Implementation

### What the Backend Needs to Do:

**When a job is created:**
1. Insert a new row in `user_jobs` table with:
   - `user_id`: The user who created the job
   - `job_id`: The external job ID (from your backend)
   - `requested_count`: Number of accounts requested
   - `status`: 'pending' or 'processing'

**When a job completes:**
1. Update the `user_jobs` row with:
   - `successful_count`: Number of accounts successfully created
   - `failed_count`: Number of accounts that failed
   - `status`: 'completed' or 'failed'
   - `completed_at`: Timestamp when job finished

### API Endpoint Available

**PATCH `/api/stats`** - Create or update job record

**Request Body:**
```json
{
  "job_id": "your-backend-job-id",
  "requested_count": 5,
  "successful_count": 4,
  "failed_count": 1,
  "status": "completed"
}
```

**Response:**
```json
{
  "job_id": "your-backend-job-id",
  "requested_count": 5,
  "successful_count": 4,
  "failed_count": 1,
  "status": "completed"
}
```

**Authentication:** Requires user session (JWT token in cookies)

### Alternative: Direct Supabase Insert/Update

If you prefer to use Supabase directly (with service role key):

**Insert job when created:**
```javascript
const { data, error } = await supabase
  .from('user_jobs')
  .insert({
    user_id: userId,
    job_id: backendJobId,
    requested_count: accountsRequested,
    status: 'pending'
  })
```

**Update job when completed:**
```javascript
const { data, error } = await supabase
  .from('user_jobs')
  .update({
    successful_count: accountsCreated,
    failed_count: accountsFailed,
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  .eq('job_id', backendJobId)
```

## Migration Steps

1. ✅ Database migration applied (creates `user_jobs`, drops `user_stats`)
2. ✅ Frontend code updated (calculates stats from `user_jobs`)
3. ⚠️ **Backend needs to be updated** to save jobs instead of updating stats

## What to Update in Backend

### Before (Old Way):
```javascript
// Update user_stats table
await updateUserStats(userId, {
  requested: totalRequested,
  successful: totalCreated,
  failures: totalFailed
})
```

### After (New Way):
```javascript
// Save job record
await saveUserJob({
  user_id: userId,
  job_id: jobId,
  requested_count: totalRequested,
  successful_count: totalCreated,
  failed_count: totalFailed,
  status: 'completed'
})
```

## Example Backend Implementation

```javascript
// When job is created
async function createJob(userId, accountsRequested) {
  const jobId = generateJobId()
  
  // Create job record
  await supabase
    .from('user_jobs')
    .insert({
      user_id: userId,
      job_id: jobId,
      requested_count: accountsRequested,
      status: 'pending'
    })
  
  // ... rest of job creation logic
  return jobId
}

// When job completes
async function completeJob(jobId, results) {
  await supabase
    .from('user_jobs')
    .update({
      successful_count: results.successful,
      failed_count: results.failed,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('job_id', jobId)
}
```

## Benefits

✅ **Accurate date filtering** - Can filter stats by date range
✅ **Better analytics** - Track individual job performance
✅ **Historical data** - Keep record of all jobs
✅ **No data loss** - Each job is tracked separately

## Questions?

If you need help implementing this, let me know!
