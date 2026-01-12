-- Verify and ensure user_accounts table has all necessary policies
-- This migration ensures the table is properly configured for production use
-- Idempotent: safe to run multiple times, creates table if it doesn't exist

-- Create table if it doesn't exist (from migration 026)
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  region TEXT,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, email) -- Prevent duplicate accounts per user
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_job_id ON public.user_accounts(job_id);

-- Ensure RLS is enabled
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent - safe to run multiple times)
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.user_accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.user_accounts;

-- Create SELECT policy: Users can view their own accounts
CREATE POLICY "Users can view their own accounts"
  ON public.user_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create INSERT policy: Users can insert their own accounts
CREATE POLICY "Users can insert their own accounts"
  ON public.user_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy: Users can update their own accounts (for password changes, etc.)
CREATE POLICY "Users can update their own accounts"
  ON public.user_accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy: Users can delete their own accounts
CREATE POLICY "Users can delete their own accounts"
  ON public.user_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions (idempotent)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_accounts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comment explaining the table
COMMENT ON TABLE public.user_accounts IS 'Stores business center accounts created for each user. Accounts are inserted when jobs complete. Each user can only access their own accounts.';
