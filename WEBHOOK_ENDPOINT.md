# Stripe Webhook Endpoint URL

## What to Put in Stripe Dashboard:

### For Vercel Deployment:

```
https://your-vercel-domain.vercel.app/api/stripe/webhook
```

**Replace `your-vercel-domain` with your actual Vercel domain.**

### How to Find Your Vercel URL:

1. Go to https://vercel.com/dashboard
2. Click on your project (hoot-frontend)
3. Look at the **"Domains"** section or check the deployment URL
4. It's usually one of:
   - `https://hoot-frontend.vercel.app` (default)
   - `https://hoot-frontend-xyz123.vercel.app` (if you have a custom domain)
   - Or your custom domain like `https://hoot.com`

### Example URLs:

If your Vercel project is `hoot-frontend`:
```
https://hoot-frontend.vercel.app/api/stripe/webhook
```

If you have a custom domain like `hoot.com`:
```
https://hoot.com/api/stripe/webhook
```

## What Events to Select in Stripe Dashboard:

When setting up the webhook endpoint, make sure to select these events:

✅ **Required:**
- `checkout.session.completed` - Triggers when user completes payment
- `payment_intent.succeeded` - Backup confirmation of successful payment
- `payment_intent.payment_failed` - Handles failed payments

## After Adding Endpoint:

1. Click **"Add endpoint"** or **"Reveal signing secret"**
2. Copy the **Signing secret** (starts with `whsec_...`)
3. Add to Vercel environment variables as: `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Redeploy your Vercel project

## Testing:

After setup, make a test purchase:
1. Go to your live site → `/dashboard/credits`
2. Click "Purchase" on any package
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Credits should appear automatically!
