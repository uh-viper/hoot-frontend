# Backend User Stats Endpoint - Data Structure Explanation

## Important: `user_stats` Table Does NOT Exist

**The `user_stats` table was removed in migration 032.** Stats are now **calculated dynamically** from other tables.

## How Stats Are Calculated

User statistics come from **TWO different tables**:

### 1. **`user_jobs` Table** (for requested, successful, failures)

**Table Structure:**
```sql
CREATE TABLE public.user_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_id TEXT NOT NULL UNIQUE,
  requested_count INTEGER NOT NULL DEFAULT 0,
  successful_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

**Stats Calculation:**
- **`requested`**: `SUM(requested_count)` from all rows in `user_jobs` WHERE `user_id = {user_id}`
- **`successful`**: `SUM(successful_count)` from all rows in `user_jobs` WHERE `user_id = {user_id}`
- **`failures`**: `SUM(failed_count)` from all rows in `user_jobs` WHERE `user_id = {user_id}`

**SQL Query:**
```sql
SELECT 
  COALESCE(SUM(requested_count), 0) as requested,
  COALESCE(SUM(successful_count), 0) as successful,
  COALESCE(SUM(failed_count), 0) as failures
FROM public.user_jobs
WHERE user_id = $1;
```

### 2. **`user_accounts` Table** (for business_centers)

**Table Structure:**
```sql
CREATE TABLE public.user_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  job_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  region TEXT,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Stats Calculation:**
- **`business_centers`**: `COUNT(*)` from `user_accounts` WHERE `user_id = {user_id}`

**SQL Query:**
```sql
SELECT COUNT(*) as business_centers
FROM public.user_accounts
WHERE user_id = $1;
```

## Complete Stats Query

**Combined SQL (PostgreSQL):**
```sql
WITH job_stats AS (
  SELECT 
    COALESCE(SUM(requested_count), 0) as requested,
    COALESCE(SUM(successful_count), 0) as successful,
    COALESCE(SUM(failed_count), 0) as failures
  FROM public.user_jobs
  WHERE user_id = $1
),
account_count AS (
  SELECT COUNT(*) as business_centers
  FROM public.user_accounts
  WHERE user_id = $1
)
SELECT 
  js.requested,
  js.successful,
  js.failures,
  ac.business_centers
FROM job_stats js
CROSS JOIN account_count ac;
```

## Expected Response Format

**GET `/api/user/stats`**

**Response:**
```json
{
  "success": true,
  "stats": {
    "requested": 100,
    "successful": 95,
    "failures": 5,
    "business_centers": 95
  }
}
```

## Field Descriptions

| Field | Source | Description |
|-------|--------|-------------|
| `requested` | `user_jobs.requested_count` (SUM) | Total number of accounts requested across all jobs |
| `successful` | `user_jobs.successful_count` (SUM) | Total number of successfully created accounts |
| `failures` | `user_jobs.failed_count` (SUM) | Total number of failed account creations |
| `business_centers` | `user_accounts` (COUNT) | Total number of accounts that exist in the database |

## Important Notes

1. **No `user_stats` table exists** - Don't query it, it was removed
2. **Stats are calculated on-the-fly** - Not stored in a single table
3. **Two separate queries needed** - One for `user_jobs`, one for `user_accounts`
4. **Always filter by `user_id`** - From the API key lookup
5. **Use `COALESCE` or default to 0** - If user has no jobs/accounts, return 0

## Example Implementation (Python)

```python
async def get_user_stats(user_id: str):
    # Query user_jobs for requested, successful, failures
    jobs_result = await conn.fetchrow(
        """
        SELECT 
          COALESCE(SUM(requested_count), 0) as requested,
          COALESCE(SUM(successful_count), 0) as successful,
          COALESCE(SUM(failed_count), 0) as failures
        FROM public.user_jobs
        WHERE user_id = $1
        """,
        user_id
    )
    
    # Query user_accounts for business_centers count
    accounts_result = await conn.fetchrow(
        """
        SELECT COUNT(*) as business_centers
        FROM public.user_accounts
        WHERE user_id = $1
        """,
        user_id
    )
    
    return {
        "success": True,
        "stats": {
            "requested": jobs_result["requested"],
            "successful": jobs_result["successful"],
            "failures": jobs_result["failures"],
            "business_centers": accounts_result["business_centers"]
        }
    }
```

## Example Implementation (Node.js)

```javascript
async function getUserStats(userId) {
  // Query user_jobs for requested, successful, failures
  const jobsResult = await pool.query(
    `SELECT 
      COALESCE(SUM(requested_count), 0) as requested,
      COALESCE(SUM(successful_count), 0) as successful,
      COALESCE(SUM(failed_count), 0) as failures
    FROM public.user_jobs
    WHERE user_id = $1`,
    [userId]
  );
  
  // Query user_accounts for business_centers count
  const accountsResult = await pool.query(
    `SELECT COUNT(*) as business_centers
    FROM public.user_accounts
    WHERE user_id = $1`,
    [userId]
  );
  
  return {
    success: true,
    stats: {
      requested: parseInt(jobsResult.rows[0].requested) || 0,
      successful: parseInt(jobsResult.rows[0].successful) || 0,
      failures: parseInt(jobsResult.rows[0].failures) || 0,
      business_centers: parseInt(accountsResult.rows[0].business_centers) || 0
    }
  };
}
```

## Database Access Requirements

Your backend needs:
- **Read access** to `public.user_jobs` table
- **Read access** to `public.user_accounts` table
- **Filter by `user_id`** from the API key lookup

## Common Issues

**Issue:** "user_stats table doesn't exist"
- **Solution:** Don't query `user_stats`. It was removed. Use `user_jobs` and `user_accounts` instead.

**Issue:** "Stats are 0 or null"
- **Solution:** Use `COALESCE(SUM(...), 0)` to handle NULL values when user has no jobs/accounts.

**Issue:** "Wrong user_id type"
- **Solution:** `user_id` is UUID type. Make sure you're using the UUID from the API key lookup, not a string.

## Summary

- ❌ **Don't use:** `user_stats` table (doesn't exist)
- ✅ **Use:** `user_jobs` table for `requested`, `successful`, `failures` (SUM the counts)
- ✅ **Use:** `user_accounts` table for `business_centers` (COUNT the rows)
- ✅ **Always filter by:** `user_id` from API key lookup
- ✅ **Handle NULLs:** Use `COALESCE` or default to 0
