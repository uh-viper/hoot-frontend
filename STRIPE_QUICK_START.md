# Stripe Quick Start Guide

## What You Need From Me (Setup Checklist)

To make Stripe work so users can pay for credits and credits show up in their account, you need to:

### 1. **Get Stripe Test API Keys** (5 minutes)

1. Go to https://dashboard.stripe.com
2. **Make sure Test Mode is ON** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy these two keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal test key"

### 2. **Install Stripe CLI** (for local testing)

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Or download from:** https://stripe.com/docs/stripe-cli

Then login:
```bash
stripe login
```

### 3. **Get Webhook Secret** (for local testing)

In a terminal, run:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook secret that starts with `whsec_...` - **copy this!**

### 4. **Get Supabase Service Role Key**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **API**
4. Find **service_role** key (NOT anon key!) - it starts with `eyJhbGc...`
5. **Copy this** - it has admin privileges

### 5. **Add Environment Variables**

Create or update `.env.local` in your project root:

```env
# Stripe Keys (Test Mode - Sandbox)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Supabase Service Role (for webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc_YOUR_SERVICE_ROLE_KEY_HERE

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. **Test It!**

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. **In a separate terminal**, start Stripe webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Go to http://localhost:3000/dashboard/credits

4. Click "Purchase" on any package

5. Use this test card:
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)

6. Complete checkout - credits should automatically appear in their account!

## How It Works

1. **User clicks "Purchase"** → Creates Stripe Checkout session
2. **User pays** → Stripe processes payment
3. **Stripe sends webhook** → Your server receives payment confirmation
4. **Credits are added** → Automatically added to user's account via database function
5. **User sees success** → Redirected back with success message

## That's It!

Once you add those 4 environment variables, it should work. The database migration is already applied, so everything is ready to go.

## Need Help?

- Check `STRIPE_SETUP.md` for detailed troubleshooting
- Check Stripe Dashboard → Developers → Webhooks for failed events
- Check browser console and terminal for errors
