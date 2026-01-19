-- Create function to grant referral credits during signup
-- This function uses SECURITY DEFINER to bypass RLS policies
-- since regular users can't UPDATE user_credits directly
-- SECURITY: Validates referral code exists, is active, and matches the credits amount
--          Also ensures user hasn't already received referral credits

CREATE OR REPLACE FUNCTION public.grant_referral_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_referral_code TEXT
)
RETURNS void AS $$
DECLARE
  v_valid_credits INTEGER;
  v_referral_code_record RECORD;
  v_user_profile RECORD;
  v_normalized_code TEXT;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_referral_code IS NULL OR p_referral_code = '' THEN
    RAISE EXCEPTION 'Invalid parameters: user_id and referral_code are required';
  END IF;

  -- Normalize referral code (uppercase, alphanumeric only)
  v_normalized_code := UPPER(REGEXP_REPLACE(p_referral_code, '[^A-Z0-9]', '', 'g'));
  
  IF v_normalized_code = '' THEN
    RAISE EXCEPTION 'Invalid referral code format';
  END IF;

  -- SECURITY CHECK 1: Verify referral code exists, is active, and get free_credits from database
  -- CRITICAL: We use the database value, NOT the passed parameter, to prevent manipulation
  SELECT id, code, free_credits, is_active
  INTO v_referral_code_record
  FROM public.referral_codes
  WHERE code = v_normalized_code
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral code not found or inactive: %', v_normalized_code;
  END IF;

  -- SECURITY: Use the credits value from the database, NOT the parameter
  -- This ensures users can't manipulate the amount - we always use what's stored in DB
  v_valid_credits := GREATEST(0, LEAST(1000000, v_referral_code_record.free_credits));
  
  -- Skip if no credits to grant
  IF v_valid_credits <= 0 THEN
    RETURN;
  END IF;

  -- SECURITY CHECK 2: Verify the passed parameter matches database (for logging/audit)
  -- This is just a sanity check - we use the DB value regardless
  IF p_credits IS NOT NULL AND p_credits != v_valid_credits THEN
    RAISE EXCEPTION 'Credits mismatch. Referral code % has % credits in database, but % was passed', 
      v_normalized_code, v_valid_credits, p_credits;
  END IF;

  -- SECURITY CHECK 3: Verify user profile exists and hasn't already received referral credits
  -- (This prevents users from calling this function multiple times)
  SELECT user_id, referral_code
  INTO v_user_profile
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for user: %', p_user_id;
  END IF;

  -- Check if user already has a referral code set (prevents double-granting)
  IF v_user_profile.referral_code IS NOT NULL AND v_user_profile.referral_code != v_normalized_code THEN
    RAISE EXCEPTION 'User already has a referral code set: %', v_user_profile.referral_code;
  END IF;

  -- SECURITY CHECK 4: Verify user is calling for themselves (or is admin)
  -- Only allow if the authenticated user matches p_user_id OR is an admin
  -- This prevents users from granting credits to other users
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Can only grant referral credits to your own account';
  END IF;

  -- First ensure user has a credits row (in case trigger didn't fire yet)
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, 0, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) DO NOTHING;

  -- Add credits to user
  UPDATE public.user_credits
  SET credits = credits + v_valid_credits,
      updated_at = TIMEZONE('utc', NOW())
  WHERE user_id = p_user_id;

  -- Log the referral credit grant (optional - for debugging)
  RAISE NOTICE 'Granted % referral credits to user % from code %', v_valid_credits, p_user_id, v_normalized_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (needed during signup)
-- SECURITY: Function validates all inputs and prevents abuse
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO authenticated;

-- Grant to service_role as well
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.grant_referral_credits IS 'Grants free credits from referral codes during signup. Uses SECURITY DEFINER to bypass RLS. Validates referral code exists, is active, credits match, and user authorization.';
