# Stripe Integration Setup Guide

This guide will help you set up Stripe for credit purchases in the Hoot app.

## Required Environment Variables

Add these to your `.env.local` file (for local development) and your production environment:

```env
# Stripe API Keys (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (Test Mode)
STRIPE_SECRET_KEY=sk_test_... (Test Mode)

# For Production, use:
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
# STRIPE_SECRET_KEY=sk_live_...

# Stripe Webhook Secret (get this after setting up webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Service Role Key (for webhook operations)
# Get this from: Supabase Dashboard > Project Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

## Getting Your Stripe Keys

### 1. Get API Keys (Test Mode - Sandbox)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test Mode** (toggle in top right)
3. Go to **Developers** > **API keys**
4. Copy:
   - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY` (click "Reveal test key")

### 2. Set Up Webhook Endpoint

#### For Local Development (using Stripe CLI):

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_...`) → `STRIPE_WEBHOOK_SECRET`

#### For Production:

1. Go to Stripe Dashboard > **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 3. Get Supabase Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** > **API**
4. Find **service_role key** (NOT anon key - this has admin privileges)
5. Copy it → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: Never expose the service_role key in client-side code! It bypasses RLS.

## Database Migration

Run the migration to create the purchases table:

```bash
cd hoot-frontend
supabase db push
```

This will create:
- `purchases` table to track payments
- Functions to handle credit additions
- RLS policies for security

## Testing the Integration

### Test Cards (Test Mode)

Use these test cards in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Use any future expiry date, any CVC, any ZIP.

### Test Flow

1. Start your dev server: `npm run dev`
2. Start Stripe webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Go to `/dashboard/credits`
4. Click "Purchase" on any package
5. Complete checkout with test card
6. After payment, credits should be added to your account
7. Check `/dashboard/credits` for purchase history

## Troubleshooting

### Webhook Not Receiving Events

- Check webhook endpoint is accessible (not behind firewall)
- Verify `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Check Stripe Dashboard > Developers > Webhooks for failed events

### Credits Not Adding After Payment

- Check webhook logs in Stripe Dashboard
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check browser console and server logs for errors
- Ensure migration `014_create_purchases_table.sql` has been applied

### "Unauthorized" Error on Checkout

- Verify user is logged in
- Check Supabase session is valid
- Ensure RLS policies allow user to create purchases

## Production Checklist

- [ ] Switch to Live Mode keys in Stripe Dashboard
- [ ] Update environment variables with live keys
- [ ] Set up production webhook endpoint
- [ ] Test with real card (then refund immediately)
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is production key
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Enable Stripe fraud protection features
- [ ] Set up monitoring for failed webhooks

## Security Notes

- Never commit `.env.local` to git
- Service role key should ONLY be used server-side (webhook handler)
- Webhook secret must match exactly - store securely
- Use HTTPS in production for webhook endpoints
- Consider adding rate limiting to webhook endpoint
