# Admin System Setup Guide

This guide explains how to set up and use the secure admin system for Hoot.

## Overview

The admin system provides:
- **Secure access control** - Only users with `is_admin = true` can access admin routes
- **Admin dashboard** - View all users, stats, and recent purchases
- **Protected API routes** - Admin-only endpoints for system management
- **Database-level security** - Admin status stored in `user_profiles` table

## Setup Steps

### 1. Run the Database Migrations

Apply both migrations to add the `is_admin` field and RLS policies:

```bash
# Using Supabase CLI (recommended)
supabase migration up

# OR manually apply the migrations in Supabase Dashboard:
# 1. supabase/migrations/029_add_admin_role.sql (adds is_admin field)
# 2. supabase/migrations/030_add_admin_rls_policies.sql (adds admin RLS policies)
```

### 2. Grant Admin Access to a User

Manually grant admin access via Supabase Dashboard SQL Editor:

```sql
-- By email
UPDATE public.user_profiles 
SET is_admin = true 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);

-- By user ID
UPDATE public.user_profiles 
SET is_admin = true 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';
```

### 3. Access the Admin Dashboard

Once admin access is granted, you can:
1. Log in to your account
2. Navigate to `/dashboard/admin` or click "Admin" in the sidebar
3. View user management, stats, and recent purchases

## Security Features

### Multi-Layer Protection

1. **Middleware Protection** - Unauthenticated users are redirected from `/admin` routes
2. **Server-Side Checks** - All admin pages and API routes verify admin status
3. **Database-Level** - Admin status stored in database, checked on every request
4. **RLS Policies** - Row Level Security ensures users can only see their own data (admin checks bypass RLS using service role)

### Protected Routes

- `/dashboard/admin` - Admin dashboard page
- `/api/admin/*` - All admin API routes

### Utility Functions

- `isAdmin()` - Check if current user is admin (returns boolean)
- `requireAdmin()` - Redirect to dashboard if not admin (for server components)
- `validateAdmin()` - Return error if not admin (for API routes)

## Admin Dashboard Features

### User Management
- View all users with their stats
- Search users by email, name, or Discord username
- Filter to show admins only
- View user credits, requested/successful/failed counts

### Purchase Management
- View recent purchases
- See purchase status, credits, and amounts
- Monitor system transactions

### System Stats
- Total users
- Total business centers created
- Total credits issued
- Total successful deployments

## Revoking Admin Access

To revoke admin access from a user:

```bash
# Via SQL
UPDATE public.user_profiles 
SET is_admin = false 
WHERE user_id = 'user-id-here';
```

## Troubleshooting

### "Admin access required" error
- Verify the user has `is_admin = true` in `user_profiles` table
- Check that the migration has been applied
- Ensure you're logged in with the correct account

### Admin link not showing in sidebar
- Check that `isAdmin` prop is being passed to Sidebar component
- Verify the user's admin status in the database
- Clear browser cache and reload

### Migration fails
- Ensure you have proper permissions in Supabase
- Check that `user_profiles` table exists
- Verify no conflicting migrations

## Best Practices

1. **Minimal Admin Access** - Only grant admin to trusted users
2. **Audit Trail** - Keep track of who has admin access
3. **Regular Reviews** - Periodically review admin users
4. **Secure Credentials** - Never commit service role keys to git
5. **Environment Variables** - Use `.env.local` for sensitive keys

## Domain Management

The admin dashboard includes a **Management** tab for domain management with automatic DNS and nameserver configuration.

### Features

- **Add Domains** - Log domains purchased from Porkbun
- **Automatic Configuration** - One-click setup that:
  - Creates/verifies Cloudflare zone
  - Updates Porkbun nameservers to Cloudflare
  - Configures DNS records in Cloudflare
- **Domain Status Tracking** - Monitor domain configuration status (pending, active, error)

### Required Environment Variables

For domain management to work, set these in Vercel (or `.env.local`):

```bash
# Porkbun API (Domain Registrar)
DOMAIN_API_URL=https://porkbun.com/api/json/v3
DOMAIN_API_KEY=your_porkbun_api_key
DOMAIN_API_SECRET=your_porkbun_secret_key  # Optional but recommended

# Cloudflare API (DNS Management) - Global API Key (SUPER SECURE, server-side only)
CLOUDFLARE_API_KEY=your_cloudflare_global_api_key
CLOUDFLARE_EMAIL=your_cloudflare_account_email
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

### How to Get API Credentials

#### Porkbun API
1. Log in to your Porkbun account
2. Navigate to API Access
3. Generate API key and secret key
4. Add to environment variables

#### Cloudflare API
1. Log in to Cloudflare Dashboard
2. Go to My Profile → API Tokens
3. Scroll down to "API Keys" section
4. Copy your "Global API Key" (or create one if needed)
5. Copy your account email (the one you use to log in)
6. Go to your account overview to get your Account ID
7. Add all three to environment variables
8. **IMPORTANT**: Global API key is extremely powerful - keep it secure and never expose it client-side

### Usage

1. Navigate to Admin Dashboard → Management tab
2. Enter domain name (e.g., `example.com`)
3. Click "Add Domain" to log it
4. Click "Configure" to automatically:
   - Set up Cloudflare zone
   - Update nameservers in Porkbun
   - Configure DNS records

### Database

Domains are stored in the `domains` table (created by migration `031_create_domains_table.sql`).

## API Endpoints

### Protected Admin Routes

All routes require admin authentication:

- `POST /api/admin/fix-purchase` - Fix stuck purchases
- `POST /api/admin/process-stuck-purchases` - Process all stuck purchases
- `GET /api/admin/domains` - List all domains
- `POST /api/admin/domains` - Add a new domain
- `POST /api/admin/domains/[domainId]/configure` - Configure domain (DNS + Nameservers)

These routes automatically check for admin access using `validateAdmin()`.

## Files Modified/Created

- `supabase/migrations/029_add_admin_role.sql` - Adds is_admin field to user_profiles
- `supabase/migrations/030_add_admin_rls_policies.sql` - Adds RLS policies for admin access
- `supabase/migrations/031_create_domains_table.sql` - Creates domains table for domain management
- `lib/auth/admin.ts` - Admin utility functions
- `lib/supabase/middleware.ts` - Middleware protection for admin routes
- `app/dashboard/admin/page.tsx` - Admin dashboard page
- `app/dashboard/admin/components/AdminDashboardClient.tsx` - Admin dashboard client component
- `app/dashboard/admin/components/DomainManagement.tsx` - Domain management UI component
- `app/dashboard/admin/admin.css` - Admin dashboard styles
- `app/dashboard/components/Sidebar.tsx` - Added admin link (only visible to admins)
- `app/dashboard/layout.tsx` - Pass admin status to sidebar
- `app/api/admin/*` - Protected admin API routes
- `app/api/admin/domains/route.ts` - Domain CRUD operations
- `app/api/admin/domains/[domainId]/configure/route.ts` - Domain configuration (DNS + Nameservers)