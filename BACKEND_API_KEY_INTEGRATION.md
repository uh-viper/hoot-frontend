# Backend API Key Integration Guide

## Overview

Users can generate API keys from the Settings page to authenticate with your backend API. This allows companies to integrate Hoot's services programmatically.

## API Key Format

API keys are generated in the format:
```
hoot_<64 hex characters>
```

Example:
```
hoot_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

## Database Schema

**Table: `user_keys`**

```sql
CREATE TABLE public.user_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Indexes:**
- `idx_user_keys_user_id` on `user_id`
- `idx_user_keys_api_key` on `api_key` (for fast lookups)

## Backend Authentication Flow

### 1. **Receive API Key from Request**

The API key should be sent in the `Authorization` header:

```
Authorization: Bearer hoot_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

Or as a custom header (if preferred):

```
X-API-Key: hoot_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. **Validate API Key Format**

First, validate the format:
- Must start with `hoot_`
- Must be followed by exactly 64 hexadecimal characters
- Total length: 69 characters

**Example validation (Python):**
```python
import re

def validate_api_key_format(api_key: str) -> bool:
    pattern = r'^hoot_[a-f0-9]{64}$'
    return bool(re.match(pattern, api_key, re.IGNORECASE))
```

**Example validation (Node.js):**
```javascript
function validateApiKeyFormat(apiKey) {
  const pattern = /^hoot_[a-f0-9]{64}$/i;
  return pattern.test(apiKey);
}
```

### 3. **Query Database for API Key**

Query the `user_keys` table to find the API key and get the associated `user_id`:

**SQL Query:**
```sql
SELECT 
  id,
  user_id,
  key_name,
  last_used_at,
  created_at
FROM public.user_keys
WHERE api_key = $1;
```

**Important:**
- Use parameterized queries to prevent SQL injection
- The `api_key` column is indexed, so this lookup is fast
- If no row is found, the API key is invalid

### 4. **Update `last_used_at` (Optional)**

After successful authentication, update the `last_used_at` timestamp:

```sql
UPDATE public.user_keys
SET last_used_at = NOW(),
    updated_at = NOW()
WHERE api_key = $1;
```

### 5. **Use `user_id` for Authorization**

Once you have the `user_id`, use it to:
- Fetch user's accounts: `SELECT * FROM user_accounts WHERE user_id = $1`
- Verify ownership of resources
- Apply rate limiting per user
- Log API usage

## Example Backend Implementation

### Python (FastAPI)

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
from datetime import datetime

app = FastAPI()
security = HTTPBearer()

async def get_db_connection():
    # Your database connection pool
    return await asyncpg.connect("your-connection-string")

async def authenticate_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    api_key = credentials.credentials
    
    # Validate format
    if not api_key.startswith("hoot_") or len(api_key) != 69:
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    # Query database
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT id, user_id, key_name, last_used_at, created_at
            FROM public.user_keys
            WHERE api_key = $1
            """,
            api_key
        )
        
        if not row:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Update last_used_at
        await conn.execute(
            """
            UPDATE public.user_keys
            SET last_used_at = NOW(), updated_at = NOW()
            WHERE api_key = $1
            """,
            api_key
        )
        
        return {
            "user_id": row["user_id"],
            "key_id": row["id"],
            "key_name": row["key_name"]
        }
    finally:
        await conn.close()

@app.get("/api/accounts")
async def get_accounts(user_info: dict = Depends(authenticate_api_key)):
    # user_info["user_id"] contains the authenticated user's ID
    # Fetch and return their accounts
    conn = await get_db_connection()
    try:
        accounts = await conn.fetch(
            """
            SELECT id, email, password, region, currency, created_at
            FROM public.user_accounts
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_info["user_id"]
        )
        return {"accounts": [dict(acc) for acc in accounts]}
    finally:
        await conn.close()
```

### Node.js (Express)

```javascript
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  connectionString: 'your-connection-string'
});

// Middleware to authenticate API key
async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  
  const apiKey = authHeader.substring(7); // Remove "Bearer "
  
  // Validate format
  if (!/^hoot_[a-f0-9]{64}$/i.test(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  
  // Query database
  const result = await pool.query(
    'SELECT id, user_id, key_name, last_used_at, created_at FROM public.user_keys WHERE api_key = $1',
    [apiKey]
  );
  
  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Update last_used_at
  await pool.query(
    'UPDATE public.user_keys SET last_used_at = NOW(), updated_at = NOW() WHERE api_key = $1',
    [apiKey]
  );
  
  // Attach user info to request
  req.user = {
    user_id: result.rows[0].user_id,
    key_id: result.rows[0].id,
    key_name: result.rows[0].key_name
  };
  
  next();
}

app.get('/api/accounts', authenticateApiKey, async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, password, region, currency, created_at FROM public.user_accounts WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.user_id]
  );
  
  res.json({ accounts: result.rows });
});
```

## CRITICAL SECURITY REQUIREMENTS

### ⚠️ **API Keys Can ONLY Access User's Own Data**

**This is the most important security requirement.** When you authenticate with an API key:

1. **Extract `user_id` from the database** - The API key lookup returns the `user_id` associated with that key
2. **ALWAYS verify ownership** - Every request must verify that the resource belongs to that `user_id`
3. **Never bypass ownership checks** - API keys are NOT admin keys. They have the same permissions as the user's session

**Example - Fetching Accounts:**
```sql
-- CORRECT: Only return accounts for the authenticated user
SELECT * FROM user_accounts WHERE user_id = $1;  -- $1 = user_id from API key

-- WRONG: Never do this
SELECT * FROM user_accounts;  -- This would expose all users' accounts!
```

**Example - Deleting Account:**
```sql
-- CORRECT: Verify ownership before deletion
DELETE FROM user_accounts 
WHERE id = $1 AND user_id = $2;  -- $1 = account_id, $2 = user_id from API key

-- WRONG: Missing ownership check
DELETE FROM user_accounts WHERE id = $1;  -- Could delete anyone's account!
```

### 🔒 **One Key Per User**

- Each user can have **only ONE** API key at a time
- Creating a new key automatically deletes the old one (regeneration)
- The database enforces this with a `UNIQUE` constraint on `user_id`

## Security Best Practices

### 1. **Always Use Parameterized Queries**
Never concatenate API keys into SQL strings. Always use parameterized queries to prevent SQL injection.

### 2. **Always Verify Ownership**
Every API endpoint must verify that the requested resource belongs to the `user_id` from the API key:
- **GET /api/accounts** → `WHERE user_id = $1` (from API key)
- **DELETE /api/accounts/{id}** → `WHERE id = $1 AND user_id = $2` (from API key)
- **POST /api/fetch-code** → Verify account belongs to `user_id` from API key

### 3. **Rate Limiting**
Implement rate limiting per API key or per user:
- Limit requests per minute/hour
- Use `user_id` from the API key lookup for rate limiting
- Consider using Redis or similar for distributed rate limiting

### 4. **HTTPS Only**
Only accept API keys over HTTPS. Reject requests over HTTP in production.

### 5. **Logging**
Log API key usage:
- Log successful authentications with `user_id`
- Log failed authentication attempts (but don't expose why they failed)
- Monitor for suspicious patterns
- **Never log the full API key** - only log the first few characters (e.g., `hoot_a1b2...`)

### 6. **Key Rotation**
Users can regenerate their API key from the Settings page (deletes old, creates new). Your backend should handle deleted keys gracefully (return 401).

### 7. **Error Messages**
Don't expose whether an API key exists or not:
- Invalid format: "Invalid API key format"
- Key not found: "Invalid API key" (same message)
- Don't say "API key not found" vs "API key invalid"

### 8. **Database Connection**
Use connection pooling for database queries. The API key lookup should be fast (indexed column).

### 9. **Never Trust Client-Supplied user_id**
Always get `user_id` from the API key lookup. Never accept `user_id` from request body/headers and trust it.

## API Endpoints That Should Accept API Keys

Based on the frontend implementation, these endpoints should accept API key authentication:

1. **GET /api/accounts** - List user's accounts
2. **DELETE /api/accounts/{accountId}** - Delete an account (verify ownership)
3. **POST /api/fetch-code** - Fetch verification code for an account

All endpoints should:
- Accept both JWT (from Supabase session) and API key authentication
- Verify resource ownership using `user_id`
- Return appropriate error codes (401 for auth failures, 403 for ownership issues)

## Testing API Keys

### Using cURL

```bash
# List accounts
curl -X GET "https://your-api.com/api/accounts" \
  -H "Authorization: Bearer hoot_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"

# Delete account
curl -X DELETE "https://your-api.com/api/accounts/account-uuid" \
  -H "Authorization: Bearer hoot_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
```

### Using Postman

1. Set Authorization type to "Bearer Token"
2. Enter the API key (including `hoot_` prefix)
3. Make requests to your endpoints

## Database Access

Your backend needs read access to the `user_keys` table. Options:

1. **Direct Database Connection**: Connect to Supabase Postgres with service role key
2. **Supabase Client**: Use Supabase JS client with service role key (read-only for `user_keys`)
3. **API Endpoint**: Create a frontend API endpoint that validates keys (not recommended for high traffic)

**Recommended**: Direct database connection with connection pooling.

## Summary

1. **Format**: `hoot_` + 64 hex characters
2. **Header**: `Authorization: Bearer <api_key>`
3. **Validation**: Check format, then query `user_keys` table
4. **User ID**: Extract `user_id` from the database row
5. **Authorization**: Use `user_id` to verify resource ownership
6. **Security**: Parameterized queries, rate limiting, HTTPS only, generic errors
