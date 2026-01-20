# Email Deliverability Fix Guide

## Problem
Emails sent via Supabase + Resend are going to spam immediately.

## Root Causes
1. **Missing DNS Authentication** (SPF, DKIM, DMARC) - Required by Gmail/Yahoo as of 2024
2. **Using default Supabase SMTP** - Poor deliverability, rate limited
3. **Mismatched domains** - Auth links using `supabase.co` while sending from your domain
4. **No custom domain configured** for authentication

## Solution Steps

### Step 1: Configure Custom SMTP in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Enter Resend SMTP credentials:
   - **Host**: `smtp.resend.com`
   - **Port**: `587` (or `465` for SSL)
   - **Username**: `resend`
   - **Password**: Your Resend API key (get from Resend dashboard)
   - **Sender email**: `noreply@yourdomain.com` (must be verified in Resend)
   - **Sender name**: Your company name

### Step 2: Verify Domain in Resend

1. Go to **Resend Dashboard** → **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Resend will provide DNS records you need to add

### Step 3: Add DNS Records

Add these records to your domain's DNS (wherever you manage DNS - Cloudflare, Route53, etc.):

#### A. SPF Record (TXT)
```
Type: TXT
Name: @ (or yourdomain.com)
Value: v=spf1 include:resend.com ~all
TTL: 3600
```

**Important**: If you already have an SPF record, combine them:
```
v=spf1 include:resend.com include:_spf.google.com ~all
```
(Only one SPF record per domain allowed)

#### B. DKIM Records (CNAME)
Resend will provide these during domain verification. They look like:
```
Type: CNAME
Name: resend._domainkey (or similar)
Value: [provided by Resend]
TTL: 3600
```

Add ALL DKIM records Resend provides (usually 2-3 records).

#### C. DMARC Record (TXT)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

**Note**: Start with `p=none` (monitoring only). Once verified, you can upgrade to:
- `p=quarantine` (send suspicious emails to spam)
- `p=reject` (reject suspicious emails entirely)

#### D. Verify Records
After adding DNS records, wait 5-10 minutes, then:
- Use a DNS checker: https://mxtoolbox.com/spf.aspx
- Check in Resend dashboard - it should show "Verified"

### Step 4: Set Up Custom Domain for Auth Links

**CRITICAL**: Supabase defaults to `supabase.co` for auth links, which triggers spam filters.

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://yourdomain.com`
3. Set **Redirect URLs**: Add your production domain
4. **Custom Domain** (if available in your plan):
   - Set up `auth.yourdomain.com` as a subdomain
   - Point it to Supabase's auth service
   - This ensures auth links match your sending domain

### Step 5: Optimize Email Settings in Resend

1. **Disable Tracking for Auth Emails**:
   - Go to Resend → Settings
   - For verification/password reset emails, disable:
     - Link Tracking
     - Open Tracking
   - (Link scanners flag tracked links as suspicious)

2. **Use Dedicated Subdomain**:
   - Consider using `mail.yourdomain.com` or `auth.yourdomain.com` for sending
   - Isolates email reputation from your main domain

3. **From Address**:
   - Always use verified domain: `noreply@yourdomain.com`
   - Never use generic addresses or unverified domains

### Step 6: Update Supabase Email Templates

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Update templates to use your custom domain in links
3. Ensure "From" address matches your verified Resend domain

### Step 7: Test Deliverability

1. Send test emails to:
   - Gmail
   - Yahoo
   - Outlook
   - Your own email

2. Check spam folder - should NOT go to spam

3. Use email testing tools:
   - https://www.mail-tester.com/ (free, gives score 0-10)
   - https://mxtoolbox.com/EmailHealth/ (checks SPF, DKIM, DMARC)

### Step 8: Monitor and Maintain

1. **Keep spam complaint rate below 0.3%** (Gmail requirement)
2. **Warm up your domain** if it's new:
   - Start with low volume
   - Gradually increase over 2-4 weeks
3. **Monitor bounce rates** in Resend dashboard
4. **Maintain good sender reputation**:
   - Only send to opted-in users
   - Include unsubscribe links
   - Don't send too frequently

## Quick Checklist

- [ ] Custom SMTP configured in Supabase with Resend
- [ ] Domain verified in Resend
- [ ] SPF record added to DNS
- [ ] DKIM records added to DNS (all of them)
- [ ] DMARC record added to DNS
- [ ] DNS records verified (wait 5-10 min, check with tools)
- [ ] Custom domain set up for auth links (if possible)
- [ ] Email templates updated to use custom domain
- [ ] Tracking disabled for auth emails
- [ ] Test emails sent and verified (not in spam)

## Common Issues

### "Still going to spam after setup"
- Wait 24-48 hours for DNS propagation
- Check all DNS records are correct (use mxtoolbox.com)
- Ensure you're using verified domain in "From" address
- Check spam score with mail-tester.com

### "Can't verify domain in Resend"
- Ensure DNS records are exactly as provided
- Wait longer for DNS propagation (can take up to 48 hours)
- Check for typos in DNS records
- Ensure you have access to DNS management

### "SPF record error"
- Only one SPF record allowed per domain
- Combine multiple includes: `v=spf1 include:resend.com include:other.com ~all`
- Don't use multiple separate SPF records

## Additional Resources

- Resend Deliverability Guide: https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails
- Supabase SMTP Docs: https://supabase.com/docs/guides/auth/auth-smtp
- Email Authentication Guide: https://resend.com/blog/email-authentication-a-developers-guide
