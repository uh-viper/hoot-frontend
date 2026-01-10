# Security Analysis - Hoot Frontend

## 🚨 CRITICAL ISSUE FOUND

**The `/api/credits` PATCH endpoint allows authenticated users to directly modify their credits!** This is a major vulnerability. Users can call this API to add unlimited credits to their account.

**FIX REQUIRED**: This endpoint should be removed or restricted to internal/admin use only. Credits should ONLY be modified through:
1. Stripe webhook (after verified payment)
2. Admin/internal functions (for refunds, corrections, etc.)

---

## ✅ What's Currently Secure

### 1. **Row Level Security (RLS) Policies**
All tables have RLS enabled with strict policies:
- **user_credits**: Users can only SELECT/UPDATE their own row (`auth.uid() = user_id`)
- **user_stats**: Users can only SELECT/UPDATE their own row
- **user_profiles**: Users can only SELECT/INSERT/UPDATE their own row
- **purchases**: Users can only SELECT their own purchases

**Result**: Even if someone tries to hack the database directly, they can only access/modify their own data.

### 2. **SECURITY DEFINER Functions (Safe Implementation)**

#### `ensure_user_credits(p_user_id UUID)`
- ✅ **SAFE**: Only inserts a row with 0 credits if it doesn't exist
- ✅ **SAFE**: Uses `ON CONFLICT DO NOTHING` - cannot modify existing credits
- ✅ **SAFE**: Can only be called by authenticated users (via RPC)
- ⚠️ **MINOR RISK**: Users could call this repeatedly, but it does nothing harmful

#### `ensure_user_stats(p_user_id UUID)`
- ✅ **SAFE**: Same as above - only creates with 0 stats, cannot modify existing

#### `add_credits_to_user(p_user_id UUID, p_credits INTEGER, p_purchase_id UUID)`
- ✅ **SAFE**: Only called from Stripe webhook (verified signature)
- ✅ **SAFE**: Requires a valid `purchase_id` that must exist in purchases table
- ✅ **SAFE**: Webhook uses service role key (bypasses RLS, but only from secure webhook)
- ✅ **SAFE**: Can only add credits, never subtract or set to arbitrary value

#### `upsert_user_profile(...)`
- ✅ **SAFE**: Users can only update their own profile (handled by RLS)

### 3. **Stripe Webhook Security**
- ✅ **VERIFIED**: Webhook signature is verified using `STRIPE_WEBHOOK_SECRET`
- ✅ **SECURE**: Only Stripe can send valid webhooks (signature verification fails if tampered)
- ✅ **SAFE**: Uses service role key (necessary for webhook, but only from verified Stripe requests)
- ✅ **SECURE**: Only processes `checkout.session.completed` events with `payment_status === 'paid'`

### 4. **Credit Purchase Flow Security**
1. User clicks "Purchase" → Calls `/api/stripe/create-checkout`
   - ✅ Requires authentication (user must be logged in)
   - ✅ Creates purchase record with `pending` status
   - ✅ Redirects to Stripe (no direct credit addition)

2. User pays on Stripe → Stripe sends webhook to `/api/stripe/webhook`
   - ✅ Webhook signature verified (cannot be faked)
   - ✅ Only processes if `payment_status === 'paid'`
   - ✅ Calls `add_credits_to_user` with verified purchase data
   - ✅ Credits are added based on what was actually purchased

**Result**: Credits can ONLY be added through verified Stripe payments.

### 5. **Authentication & Authorization**
- ✅ All API routes require authentication (`getSessionUser()`)
- ✅ Middleware protects dashboard routes
- ✅ RLS policies enforce data isolation at database level

---

## ⚠️ Security Concerns to Address

### 1. **CRITICAL: `/api/credits` PATCH Endpoint**
**Problem**: Any authenticated user can call this to modify their credits.
```typescript
// This is VULNERABLE - users can add credits themselves!
PATCH /api/credits
Body: { credits: 10000, operation: 'add' }
```

**Recommendation**: 
- Remove this endpoint entirely, OR
- Restrict to admin/internal use only (check for admin role), OR
- Remove 'add' and 'set' operations, only allow 'subtract' for internal use

### 2. **User Credits Update Policy**
The UPDATE policy on `user_credits` allows users to update their own credits directly:
```sql
CREATE POLICY "Users can update their own credits"
  ON public.user_credits FOR UPDATE
  USING (auth.uid() = user_id);
```

**Issue**: Users could theoretically call Supabase client directly to update credits (though they'd need to know how).

**Recommendation**: 
- Remove the UPDATE policy for regular users
- Only allow updates through RPC functions that verify legitimacy
- Or remove the PATCH endpoint (which is the main attack vector)

### 3. **SECURITY DEFINER Functions - Potential Abuse**
While the functions themselves are safe, we should add additional safeguards:
- Rate limiting on RPC function calls
- Audit logging of credit modifications
- Verification that `add_credits_to_user` is only called with valid purchase records

---

## 🔒 Recommended Security Improvements

### 1. **Remove or Secure the PATCH Endpoint**
```typescript
// OPTION A: Remove entirely
// DELETE the PATCH handler in /api/credits/route.ts

// OPTION B: Make it admin-only
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser()
  if (!user?.isAdmin) {  // Check admin role
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  // ... rest of code
}

// OPTION C: Only allow 'subtract' for internal use (still risky)
// Remove 'add' and 'set' operations entirely
```

### 2. **Remove UPDATE Policy for user_credits**
```sql
-- Remove the policy that allows direct updates
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- Credits can now ONLY be modified through RPC functions
-- which have proper validation and security checks
```

### 3. **Add Audit Logging**
Create an `audit_log` table to track all credit modifications:
- Who modified credits
- When
- How (purchase, refund, admin, etc.)
- Amount
- Purchase ID (if applicable)

### 4. **Add Rate Limiting to RPC Functions**
Prevent abuse by limiting how often functions can be called:
- Rate limit `ensure_user_credits` calls per user
- Prevent rapid-fire webhook retries

### 5. **Add Validation to `add_credits_to_user`**
Verify the purchase exists and matches before adding credits:
```sql
-- In add_credits_to_user function, verify purchase exists and matches user
IF NOT EXISTS (
  SELECT 1 FROM purchases 
  WHERE id = p_purchase_id 
  AND user_id = p_user_id
  AND status = 'pending'
) THEN
  RAISE EXCEPTION 'Invalid purchase or purchase already processed';
END IF;
```

---

## ✅ Current Security Strengths

1. **Database-level security** (RLS) - even if API is compromised, database protects data
2. **Stripe webhook verification** - cannot be faked
3. **Service role key isolation** - only used in secure webhook handler
4. **Authentication required** - all sensitive operations require login
5. **Data isolation** - users cannot access other users' data

---

## 🎯 Summary

**Main Risk**: The `/api/credits` PATCH endpoint allows users to modify credits directly.

**Everything Else**: The security implementation is solid with RLS, verified webhooks, and proper authentication. The SECURITY DEFINER functions are safe because they can only be called in controlled ways.

**Priority Fix**: Remove or restrict the PATCH endpoint immediately before going public.
