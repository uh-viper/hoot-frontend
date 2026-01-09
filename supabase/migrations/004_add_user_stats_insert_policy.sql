-- Add INSERT policy for user_stats so users can create their own stats if needed
-- This is a fallback in case the trigger doesn't fire
CREATE POLICY "Users can insert their own stats"
  ON public.user_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant INSERT permission
GRANT INSERT ON public.user_stats TO authenticated;
