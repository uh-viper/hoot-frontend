-- Add RLS policy to allow admins to view all user_jobs
-- This was missing from migration 032 when user_jobs was created

-- Drop the existing policy first (if any) to replace it with one that includes admin access
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.user_jobs;

-- Create policy that allows users to view their own jobs OR admins to view all jobs
CREATE POLICY "Users can view their own jobs"
  ON public.user_jobs
  FOR SELECT
  USING (
    auth.uid() = user_id OR public.is_admin()
  );

-- Add comment for clarity
COMMENT ON POLICY "Users can view their own jobs" ON public.user_jobs IS 'Users can view their own jobs, admins can view all jobs';
