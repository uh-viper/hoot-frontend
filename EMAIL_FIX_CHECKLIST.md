# Quick Email Deliverability Fix Checklist

## Immediate Actions (Do These First)

### 1. Supabase SMTP Configuration
- [ ] Go to Supabase Dashboard → Authentication → Settings → SMTP Settings
- [ ] Enable "Custom SMTP"
- [ ] Enter Resend SMTP:
  - Host: `smtp.resend.com`
  - Port: `587`
  - Username: `resend`
  - Password: [Your Resend API Key]
  - From: `noreply@yourdomain.com`

### 2. Resend Domain Setup
- [ ] Go to Resend Dashboard → Domains
- [ ] Add your domain (e.g., `hootservices.com`)
- [ ] Copy the DNS records Resend provides

### 3. DNS Records (Add to Your Domain Provider)
- [ ] **SPF Record** (TXT):
  ```
  Name: @
  Value: v=spf1 include:resend.com ~all
  ```
- [ ] **DKIM Records** (CNAME) - Add ALL records Resend provides
- [ ] **DMARC Record** (TXT):
  ```
  Name: _dmarc
  Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
  ```

### 4. Verify DNS Records
- [ ] Wait 5-10 minutes after adding DNS records
- [ ] Check at https://mxtoolbox.com/spf.aspx
- [ ] Verify in Resend dashboard shows "Verified"

### 5. Supabase Auth Domain
- [ ] Go to Supabase → Authentication → URL Configuration
- [ ] Set Site URL to your production domain
- [ ] Add redirect URLs for your domain

### 6. Test
- [ ] Send test verification email
- [ ] Check it arrives in inbox (not spam)
- [ ] Test with Gmail, Yahoo, Outlook

## Expected Timeline
- DNS propagation: 5 minutes to 48 hours (usually 10-30 min)
- Full deliverability improvement: 24-48 hours after DNS is verified

## If Still Going to Spam After 48 Hours
1. Double-check all DNS records are correct
2. Test with https://www.mail-tester.com/ (should score 8+)
3. Ensure "From" address uses your verified domain
4. Check Resend dashboard for any errors
