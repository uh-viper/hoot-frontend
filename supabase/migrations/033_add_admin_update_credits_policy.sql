-- Add RLS policy to allow admins to update user_credits
-- This enables the admin dashboard feature to add/deduct credits

-- ============================================
-- USER_CREDITS - Allow admins to update all credits
-- ============================================
DROP POLICY IF EXISTS "Admins can update all credits" ON public.user_credits;

CREATE POLICY "Admins can update all credits"
  ON public.user_credits
  FOR UPDATE
  USING (
    -- Admins can update any user's credits
    public.is_admin()
  )
  WITH CHECK (
    -- Admins can update any user's credits
    public.is_admin()
  );

-- Grant UPDATE permission to authenticated users (needed for RLS policies to work)
-- The RLS policy will restrict this to admins only
GRANT UPDATE ON public.user_credits TO authenticated;
