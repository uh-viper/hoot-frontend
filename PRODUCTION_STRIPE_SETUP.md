# Production Stripe Setup - Quick Guide

For **live/production** website testing, you need these 2 additional environment variables:

## What You Need to Add to Vercel:

### 1. **Stripe Webhook Secret** (`STRIPE_WEBHOOK_SECRET`)

**Why you need it:** Stripe signs webhook requests. We need this secret to verify payments actually came from Stripe (security requirement).

**How to get it:**
1. Go to https://dashboard.stripe.com (make sure you're in **Test Mode** or **Live Mode** depending on what you want)
2. Go to **Developers** → **Webhooks**
3. Click **"Add endpoint"** (or edit existing one)
4. Set your endpoint URL to: `https://your-domain.com/api/stripe/webhook`
   - Replace `your-domain.com` with your actual Vercel domain
   - Example: `https://hoot-frontend.vercel.app/api/stripe/webhook`
5. Select these events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click **"Add endpoint"**
7. Click on the endpoint you just created
8. Copy the **"Signing secret"** (starts with `whsec_...`)
9. Add to Vercel: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 2. **Supabase Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`)

**Why you need it:** When Stripe sends payment confirmation, there's no logged-in user. We need this key to bypass security rules and add credits to user accounts.

**How to get it:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **API**
4. Find **"service_role" key** (NOT the anon key - it's a different key!)
5. Click **"Reveal"** to show it
6. Copy the key (starts with `eyJhbGc...`)
7. Add to Vercel: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`

⚠️ **Important:** This key has admin privileges. Never expose it in client-side code or commit it to git. Only use it server-side (which we are doing).

## Summary - What Goes in Vercel Environment Variables:

```env
# Already added ✅
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Need to add ⚠️
STRIPE_WEBHOOK_SECRET=whsec_...  (from Stripe Dashboard → Webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (from Supabase → Settings → API → service_role key)
```

## Why These Are Required:

- **Without webhook secret:** Webhook will reject all requests → Credits never added → Users pay but don't get credits ❌
- **Without service role key:** Can't update database → Credits never added → Users pay but don't get credits ❌

## Test After Adding:

1. Add both environment variables to Vercel
2. Redeploy (or wait for auto-deploy)
3. Go to your live site → `/dashboard/credits`
4. Click "Purchase" on a package
5. Complete checkout with test card: `4242 4242 4242 4242`
6. Credits should automatically appear in account!

That's it! These are the only 2 additional variables needed for production.
