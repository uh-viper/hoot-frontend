# Security Guide

## GitHub Repository Security

### ✅ What's Safe to Commit

- **Code files** (`.ts`, `.tsx`, `.js`, `.jsx`, etc.)
- **Configuration files** (without secrets)
- **Documentation** (`.md` files with placeholders, not real keys)
- **Public keys** (like `NEXT_PUBLIC_SUPABASE_ANON_KEY` - this is safe, it's meant to be public)

### ❌ What's NEVER Safe to Commit

- **API Keys** (Cloudflare, Porkbun, Stripe secret keys)
- **Service Role Keys** (Supabase service role key)
- **Database passwords**
- **Environment variables with real values**
- **`.env` files** (already in `.gitignore`)

## Current Security Status

### ✅ Good Practices We're Using

1. **Environment Variables**: All sensitive keys are stored in environment variables, not hardcoded
2. **`.gitignore`**: `.env*` files are ignored (won't be committed)
3. **Public Keys Only**: Only public keys (like `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are in code
4. **Server-Side Only**: Sensitive operations (Cloudflare, Porkbun APIs) are server-side only

### ⚠️ Important Notes

**Private Repos Are NOT 100% Secure:**
- Private repos can be accessed by anyone with repository access
- If someone gets access to your GitHub account, they can see everything
- GitHub employees with admin access can see private repos
- If the repo is ever made public (accidentally), all history is visible
- If you share the repo with collaborators, they can see everything

**Best Practices:**
1. ✅ **Never commit secrets** - Even to private repos
2. ✅ **Use environment variables** - Store secrets in Vercel, not in code
3. ✅ **Rotate keys regularly** - Change API keys periodically
4. ✅ **Use different keys** - Different keys for dev/staging/production
5. ✅ **Review access** - Regularly review who has access to your repo
6. ✅ **Enable 2FA** - Use two-factor authentication on GitHub

## Environment Variables Setup

All sensitive keys should be set in **Vercel** (not committed to git):

### Required Environment Variables

```bash
# Supabase (Public - Safe to be in code)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase (Private - NEVER commit)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Domain Management APIs (Private - NEVER commit)
DOMAIN_API_URL=https://api.porkbun.com/api/json/v3
DOMAIN_API_KEY=your_porkbun_api_key
DOMAIN_API_SECRET=your_porkbun_secret_key

# Cloudflare API (Private - NEVER commit)
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_EMAIL=your_cloudflare_email
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Email Fetcher (Private - NEVER commit)
EMAIL_FETCHER=https://your-worker.workers.dev

# Stripe (Private - NEVER commit)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Domains API (Private - NEVER commit)
FETCH_DOMAINS=your_api_key_for_backend_server
```

## If You Accidentally Committed a Secret

1. **Immediately rotate the key** - Generate a new key in the service (Vercel, Supabase, etc.)
2. **Remove from git history** - Use `git filter-branch` or GitHub's secret scanning
3. **Update everywhere** - Update the key in Vercel and all services
4. **Consider the key compromised** - Assume anyone with repo access saw it

### Removing Secrets from Git History

```bash
# WARNING: This rewrites git history. Coordinate with team first!
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/file" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (destructive!)
git push origin --force --all
```

**Better approach**: Use GitHub's secret scanning feature or contact GitHub support.

## Security Checklist

- [ ] No hardcoded API keys in code
- [ ] All `.env` files in `.gitignore`
- [ ] Environment variables set in Vercel
- [ ] Public keys only in `NEXT_PUBLIC_*` variables
- [ ] 2FA enabled on GitHub account
- [ ] Regular review of repository collaborators
- [ ] Keys rotated periodically
- [ ] Different keys for dev/staging/production

## Questions?

If you're unsure whether something is safe to commit:
1. **Ask yourself**: "Would I be okay if this was public?"
2. **If it's a secret**: Use environment variables
3. **If it's a public key**: It's usually fine (like `NEXT_PUBLIC_*`)
4. **When in doubt**: Don't commit it
