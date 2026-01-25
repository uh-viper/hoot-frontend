# Backend API Requirements - Account Management

## Current Frontend Implementation

### 1. **Fetch User Accounts**

**Current Implementation:**
- Frontend queries Supabase directly (no API endpoint)
- Query: `SELECT id, email, password, region, currency, created_at FROM user_accounts WHERE user_id = {user.id} ORDER BY created_at DESC`
- Uses Supabase real-time subscriptions for live updates

**For Backend API (if needed):**
```
GET /api/accounts
Headers:
  Authorization: Bearer <supabase_jwt_token>

Response:
{
  "accounts": [
    {
      "id": "uuid",
      "email": "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com",
      "password": "password123",
      "region": "US",
      "currency": "USD",
      "created_at": "2026-01-25T05:41:29.000Z"
    }
  ]
}
```

**Security Requirements:**
- Must verify JWT token (Supabase JWT)
- Must only return accounts where `user_id` matches JWT user ID
- No other user's accounts should be accessible

---

### 2. **Delete Account**

**Current Frontend Endpoint:**
```
DELETE /api/accounts/[accountId]
Headers:
  (Uses session cookie - authenticated user)

Request:
  accountId: UUID (from URL path)

Response (Success):
{
  "success": true,
  "message": "Account deleted successfully"
}

Response (Error):
{
  "error": "Access denied" | "Account ID is required" | "Invalid account ID format" | "Failed to delete account"
}
```

**Security Requirements:**
- Verify JWT token (Supabase JWT)
- Verify account ownership: `user_accounts.user_id` must match JWT user ID
- Validate accountId is valid UUID format
- Double-check ownership in DELETE query: `WHERE id = {accountId} AND user_id = {jwt_user_id}`
- Generic error messages (don't expose if account exists)

**For Backend API:**
```
DELETE /api/accounts/{accountId}
Headers:
  Authorization: Bearer <supabase_jwt_token>

Response (Success):
{
  "success": true,
  "message": "Account deleted successfully"
}

Response (Error):
{
  "error": "Access denied" | "Account ID is required" | "Invalid account ID format" | "Failed to delete account"
}
```

---

### 3. **Fetch Verification Code**

**Current Frontend Endpoint:**
```
POST /api/fetch-code
Headers:
  (Uses session cookie - authenticated user)

Request Body:
{
  "accountId": "uuid"
}

Response (Success):
{
  "success": true,
  "code": "ABC123",
  "attempts": 5
}

Response (Error):
{
  "success": false,
  "error": "Verification code not found after 90 seconds",
  "attempts": 45
}
```

**Security Requirements:**
- Verify JWT token
- Verify account ownership before fetching code
- Validate accountId is valid UUID
- Only fetch codes for accounts owned by the user

**For Backend API (if moving to backend):**
```
POST /api/fetch-code
Headers:
  Authorization: Bearer <supabase_jwt_token>

Request Body:
{
  "accountId": "uuid"
}

Response:
(Same as current frontend endpoint)
```

---

## Database Schema Reference

**Table: `user_accounts`**
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- email: TEXT (e.g., "hoot+tt7f3a2b1c9dexyz@hootserv.onmicrosoft.com")
- password: TEXT
- region: TEXT (nullable, e.g., "US")
- currency: TEXT (nullable, e.g., "USD")
- created_at: TIMESTAMPTZ
```

---

## Security Checklist for Backend

✅ **Authentication:**
- All endpoints require JWT token in `Authorization: Bearer <token>` header
- JWT must be validated (Supabase JWT - ES256 or HS256)
- Extract user ID from JWT token

✅ **Authorization:**
- Users can ONLY access their own accounts
- Always verify: `user_accounts.user_id = jwt_user_id`
- Never return accounts from other users

✅ **Input Validation:**
- Validate UUID format for accountId: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Validate email format if accepting email input
- Sanitize all inputs

✅ **Error Handling:**
- Generic error messages (don't expose if account exists)
- Return appropriate HTTP status codes:
  - 401: Unauthorized (invalid/missing JWT)
  - 403: Forbidden (account doesn't belong to user)
  - 400: Bad Request (invalid input)
  - 404: Not Found (account doesn't exist)
  - 500: Internal Server Error

---

## Summary for Backend Team

**If you need to create these endpoints:**

1. **GET /api/accounts**
   - Returns all accounts for authenticated user
   - Filter by: `user_id = jwt_user_id`
   - Fields: id, email, password, region, currency, created_at

2. **DELETE /api/accounts/{accountId}**
   - Deletes account if owned by user
   - Verify: `user_id = jwt_user_id` AND `id = accountId`
   - Return success/error response

3. **POST /api/fetch-code** (if moving to backend)
   - Fetches verification code for account
   - Verify account ownership first
   - Poll backend email service

**All endpoints:**
- Require JWT authentication
- Verify account ownership
- Validate UUID inputs
- Use generic error messages
