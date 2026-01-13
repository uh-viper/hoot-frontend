-- Add RLS policies to allow admins to view all data
-- These policies check if the current user has is_admin = true in user_profiles

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- USER_PROFILES - Allow admins to view all profiles
-- ============================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    -- Users can view their own profile OR admins can view all profiles
    auth.uid() = user_id OR public.is_admin()
  );

-- ============================================
-- USER_STATS - Allow admins to view all stats
-- ============================================
DROP POLICY IF EXISTS "Admins can view all stats" ON public.user_stats;

CREATE POLICY "Admins can view all stats"
  ON public.user_stats
  FOR SELECT
  USING (
    -- Users can view their own stats OR admins can view all stats
    auth.uid() = user_id OR public.is_admin()
  );

-- ============================================
-- USER_CREDITS - Allow admins to view all credits
-- ============================================
DROP POLICY IF EXISTS "Admins can view all credits" ON public.user_credits;

CREATE POLICY "Admins can view all credits"
  ON public.user_credits
  FOR SELECT
  USING (
    -- Users can view their own credits OR admins can view all credits
    auth.uid() = user_id OR public.is_admin()
  );

-- ============================================
-- USER_ACCOUNTS - Allow admins to view all accounts (for counting)
-- ============================================
DROP POLICY IF EXISTS "Admins can view all accounts" ON public.user_accounts;

CREATE POLICY "Admins can view all accounts"
  ON public.user_accounts
  FOR SELECT
  USING (
    -- Users can view their own accounts OR admins can view all accounts
    auth.uid() = user_id OR public.is_admin()
  );

-- ============================================
-- PURCHASES - Allow admins to view all purchases
-- ============================================
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;

CREATE POLICY "Admins can view all purchases"
  ON public.purchases
  FOR SELECT
  USING (
    -- Users can view their own purchases OR admins can view all purchases
    auth.uid() = user_id OR public.is_admin()
  );

-- Add comment to function
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current authenticated user has admin privileges';
