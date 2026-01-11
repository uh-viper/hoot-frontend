-- Create user_accounts table to store created business center accounts
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

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON public.user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_job_id ON public.user_accounts(job_id);

-- Enable Row Level Security
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own accounts
CREATE POLICY "Users can view their own accounts"
  ON public.user_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own accounts
CREATE POLICY "Users can insert their own accounts"
  ON public.user_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.user_accounts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
