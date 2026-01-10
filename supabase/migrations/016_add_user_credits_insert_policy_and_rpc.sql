-- Add INSERT policy for user_credits so users can create their own credits row if needed
-- This allows initializeUserData() to insert the row directly
-- Drop policy if it exists (idempotent)
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;

-- Create the policy
CREATE POLICY "Users can insert their own credits"
  ON public.user_credits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant INSERT permission
GRANT INSERT ON public.user_credits TO authenticated;

-- Create RPC function to ensure user_credits row exists (backup method using SECURITY DEFINER)
-- This can be used if direct insert fails due to RLS issues
CREATE OR REPLACE FUNCTION public.ensure_user_credits(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, 0, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_credits(UUID) TO authenticated;

-- Create RPC function to ensure user_stats row exists (backup method using SECURITY DEFINER)
-- This is for consistency and as a fallback if direct insert fails
CREATE OR REPLACE FUNCTION public.ensure_user_stats(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, business_centers, requested, successful, failures, created_at, updated_at)
  VALUES (p_user_id, 0, 0, 0, 0, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_stats(UUID) TO authenticated;
