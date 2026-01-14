-- Create user_jobs table to track individual job requests
CREATE TABLE IF NOT EXISTS public.user_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL, -- External job ID from backend
  requested_count INTEGER NOT NULL DEFAULT 0 CHECK (requested_count >= 0),
  successful_count INTEGER NOT NULL DEFAULT 0 CHECK (successful_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(job_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_jobs_user_id ON public.user_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_jobs_created_at ON public.user_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_jobs_status ON public.user_jobs(status);
CREATE INDEX IF NOT EXISTS idx_user_jobs_job_id ON public.user_jobs(job_id);

-- Enable Row Level Security
ALTER TABLE public.user_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only view their own jobs
CREATE POLICY "Users can view their own jobs"
  ON public.user_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own jobs (for frontend job creation tracking)
CREATE POLICY "Users can insert their own jobs"
  ON public.user_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Backend can update jobs (via service role, no RLS check needed)
-- This will be handled by backend using service role key

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.user_jobs TO authenticated;

-- Update handle_new_user function to remove user_stats creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0);
  
  -- user_stats removed - stats are now calculated from user_jobs
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop user_stats table and related objects (only if they exist)
DO $$ 
BEGIN
  -- Drop trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_stats_updated_at' 
    AND tgrelid = 'public.user_stats'::regclass
  ) THEN
    DROP TRIGGER update_user_stats_updated_at ON public.user_stats;
  END IF;

  -- Drop function if it exists
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'ensure_user_stats'
  ) THEN
    DROP FUNCTION IF EXISTS public.ensure_user_stats(UUID);
  END IF;

  -- Drop policies if table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_stats') THEN
    DROP POLICY IF EXISTS "Admins can view all stats" ON public.user_stats;
    DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
    DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
    DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
  END IF;

  -- Drop table if it exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_stats') THEN
    DROP TABLE public.user_stats CASCADE;
  END IF;
END $$;
