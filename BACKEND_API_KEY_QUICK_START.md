# Backend API Key Integration - Quick Start Guide

## API Key Format

- **Length**: Exactly 70 characters
- **Characters**: `a-z A-Z 0-9 _ -` (letters, numbers, dash, underscore only)
- **Example**: `a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2g3H4i5J6k7L8m9N0`

## Request Format

Clients send the API key in the `Authorization` header:

```
Authorization: Bearer <70-character-api-key>
```

Example:
```
Authorization: Bearer a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2g3H4i5J6k7L8m9N0
```

## Authentication Flow

### Step 1: Extract API Key from Header

```python
# Python
auth_header = request.headers.get('Authorization', '')
if not auth_header.startswith('Bearer '):
    return 401, {"error": "Missing or invalid Authorization header"}
api_key = auth_header.replace('Bearer ', '').strip()
```

```javascript
// Node.js
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ error: 'Missing or invalid Authorization header' });
}
const apiKey = authHeader.substring(7).trim(); // Remove "Bearer "
```

### Step 2: Validate Format

```python
# Python
import re

def validate_api_key_format(api_key: str) -> bool:
    if len(api_key) != 70:
        return False
    # Allowed: a-z A-Z 0-9 _ -
    return bool(re.match(r'^[A-Za-z0-9\-_]{70}$', api_key))

if not validate_api_key_format(api_key):
    return 401, {"error": "Invalid API key format"}
```

```javascript
// Node.js
function validateApiKeyFormat(apiKey) {
  if (apiKey.length !== 70) {
    return false;
  }
  // Allowed: a-z A-Z 0-9 _ -
  return /^[A-Za-z0-9\-_]{70}$/.test(apiKey);
}

if (!validateApiKeyFormat(apiKey)) {
  return res.status(401).json({ error: 'Invalid API key format' });
}
```

### Step 3: Query Database for user_id

**SQL Query:**
```sql
SELECT user_id, id, last_used_at, created_at
FROM public.user_keys
WHERE api_key = $1;
```

**Important**: Use parameterized queries to prevent SQL injection!

```python
# Python (using asyncpg)
row = await conn.fetchrow(
    "SELECT user_id, id, last_used_at, created_at FROM public.user_keys WHERE api_key = $1",
    api_key
)

if not row:
    return 401, {"error": "Invalid API key"}

user_id = row["user_id"]
```

```javascript
// Node.js (using pg)
const result = await pool.query(
  'SELECT user_id, id, last_used_at, created_at FROM public.user_keys WHERE api_key = $1',
  [apiKey]
);

if (result.rows.length === 0) {
  return res.status(401).json({ error: 'Invalid API key' });
}

const userId = result.rows[0].user_id;
```

### Step 4: Update last_used_at (Optional)

```sql
UPDATE public.user_keys
SET last_used_at = NOW(), updated_at = NOW()
WHERE api_key = $1;
```

### Step 5: Use user_id for Authorization

**CRITICAL**: The API key can ONLY access data belonging to the `user_id` from the database lookup.

**Example - Fetch Accounts:**
```sql
-- ✅ CORRECT: Filter by user_id
SELECT * FROM user_accounts WHERE user_id = $1;  -- $1 = user_id from API key

-- ❌ WRONG: Never do this
SELECT * FROM user_accounts;  -- This exposes all users' data!
```

**Example - Delete Account:**
```sql
-- ✅ CORRECT: Verify ownership
DELETE FROM user_accounts 
WHERE id = $1 AND user_id = $2;  -- $1 = account_id, $2 = user_id from API key

-- ❌ WRONG: Missing ownership check
DELETE FROM user_accounts WHERE id = $1;  -- Could delete anyone's account!
```

## Complete Example (Python FastAPI)

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg
import re

app = FastAPI()
security = HTTPBearer()

async def get_db_connection():
    return await asyncpg.connect("your-connection-string")

async def authenticate_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    api_key = credentials.credentials
    
    # Validate format
    if len(api_key) != 70 or not re.match(r'^[A-Za-z0-9\-_]{70}$', api_key):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    # Query database
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "SELECT user_id, id, last_used_at, created_at FROM public.user_keys WHERE api_key = $1",
            api_key
        )
        
        if not row:
            raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Update last_used_at
        await conn.execute(
            "UPDATE public.user_keys SET last_used_at = NOW(), updated_at = NOW() WHERE api_key = $1",
            api_key
        )
        
        return {"user_id": row["user_id"], "key_id": row["id"]}
    finally:
        await conn.close()

@app.get("/api/accounts")
async def get_accounts(user_info: dict = Depends(authenticate_api_key)):
    # user_info["user_id"] contains the authenticated user's ID
    conn = await get_db_connection()
    try:
        accounts = await conn.fetch(
            "SELECT id, email, password, region, currency, created_at FROM user_accounts WHERE user_id = $1 ORDER BY created_at DESC",
            user_info["user_id"]
        )
        return {"accounts": [dict(acc) for acc in accounts]}
    finally:
        await conn.close()
```

## Complete Example (Node.js Express)

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
  
  const apiKey = authHeader.substring(7).trim();
  
  // Validate format
  if (apiKey.length !== 70 || !/^[A-Za-z0-9\-_]{70}$/.test(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }
  
  // Query database
  const result = await pool.query(
    'SELECT user_id, id, last_used_at, created_at FROM public.user_keys WHERE api_key = $1',
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
    key_id: result.rows[0].id
  };
  
  next();
}

app.get('/api/accounts', authenticateApiKey, async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, password, region, currency, created_at FROM user_accounts WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.user_id]
  );
  
  res.json({ accounts: result.rows });
});
```

## Security Checklist

✅ **Always use parameterized queries** - Never concatenate API keys into SQL strings
✅ **Always verify ownership** - Every endpoint must filter by `user_id` from API key lookup
✅ **Never trust client-supplied user_id** - Always get `user_id` from the database lookup
✅ **Validate format first** - Check length and character set before database query
✅ **Generic error messages** - Don't expose whether key exists or not
✅ **HTTPS only** - Only accept API keys over HTTPS in production
✅ **Rate limiting** - Implement rate limiting per API key or per user

## Error Responses

- **401 Unauthorized**: Invalid/missing API key
  - Missing header: `{"error": "Missing or invalid Authorization header"}`
  - Invalid format: `{"error": "Invalid API key format"}`
  - Key not found: `{"error": "Invalid API key"}` (same message, don't reveal if key exists)

- **403 Forbidden**: Valid key but access denied (e.g., trying to access another user's resource)
  - `{"error": "Access denied"}`

## Database Access

Your backend needs read access to the `user_keys` table:
- **Table**: `public.user_keys`
- **Columns needed**: `user_id`, `api_key`, `last_used_at`, `updated_at`
- **Index**: `idx_user_keys_api_key` (for fast lookups)

## Testing

```bash
# Test with cURL
curl -X GET "https://your-api.com/api/accounts" \
  -H "Authorization: Bearer a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6a7B8c9D0e1F2g3H4i5J6k7L8m9N0"
```

## Summary

1. Extract API key from `Authorization: Bearer <key>` header
2. Validate: 70 characters, only `a-z A-Z 0-9 _ -`
3. Query `user_keys` table to get `user_id`
4. Use `user_id` to filter ALL resources (accounts, etc.)
5. Never trust client-supplied `user_id` - always get it from the database

**The key point**: API keys can ONLY access data for the `user_id` from the database lookup. They cannot bypass authentication or access other users' data.
