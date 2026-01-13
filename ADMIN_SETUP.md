# Admin System Setup Guide

This guide explains how to set up and use the secure admin system for Hoot.

## Overview

The admin system provides:
- **Secure access control** - Only users with `is_admin = true` can access admin routes
- **Admin dashboard** - View all users, stats, and recent purchases
- **Protected API routes** - Admin-only endpoints for system management
- **Database-level security** - Admin status stored in `user_profiles` table

## Setup Steps

### 1. Run the Database Migration

First, apply the migration to add the `is_admin` field:

```bash
# Using Supabase CLI (recommended)
supabase migration up

# OR manually apply the migration in Supabase Dashboard
# File: supabase/migrations/029_add_admin_role.sql
```

### 2. Grant Admin Access to a User

Use the provided script to grant admin access:

```bash
# Using email
npx tsx scripts/grant-admin-access.ts user@example.com

# Using user ID
npx tsx scripts/grant-admin-access.ts 123e4567-e89b-12d3-a456-426614174000
```

**Or manually via SQL:**
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

## API Endpoints

### Protected Admin Routes

All routes require admin authentication:

- `POST /api/admin/fix-purchase` - Fix stuck purchases
- `POST /api/admin/process-stuck-purchases` - Process all stuck purchases

These routes automatically check for admin access using `validateAdmin()`.

## Files Modified/Created

- `supabase/migrations/029_add_admin_role.sql` - Database migration
- `lib/auth/admin.ts` - Admin utility functions
- `lib/supabase/middleware.ts` - Middleware protection for admin routes
- `app/dashboard/admin/page.tsx` - Admin dashboard page
- `app/dashboard/admin/components/AdminDashboardClient.tsx` - Admin dashboard client component
- `app/dashboard/admin/admin.css` - Admin dashboard styles
- `app/dashboard/components/Sidebar.tsx` - Added admin link
- `app/dashboard/layout.tsx` - Pass admin status to sidebar
- `app/api/admin/*` - Protected admin API routes
- `scripts/grant-admin-access.ts` - Script to grant admin access
