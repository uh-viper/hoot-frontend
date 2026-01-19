-- Fix grant_referral_credits function - simplify and make more robust
-- Removes strict checks that were causing failures during signup

CREATE OR REPLACE FUNCTION public.grant_referral_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_referral_code TEXT
)
RETURNS void AS $$
DECLARE
  v_valid_credits INTEGER;
  v_referral_code_record RECORD;
  v_normalized_code TEXT;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN; -- Silently return instead of raising exception
  END IF;

  -- Normalize referral code (uppercase, alphanumeric only)
  v_normalized_code := UPPER(REGEXP_REPLACE(p_referral_code, '[^A-Z0-9]', '', 'g'));
  
  IF v_normalized_code = '' THEN
    RETURN; -- Silently return instead of raising exception
  END IF;

  -- Verify referral code exists, is active, and get free_credits from database
  SELECT id, code, free_credits, is_active
  INTO v_referral_code_record
  FROM public.referral_codes
  WHERE code = v_normalized_code
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE NOTICE 'Referral code not found or inactive: %', v_normalized_code;
    RETURN;
  END IF;

  -- Use the credits value from the database (security: ignore parameter)
  v_valid_credits := GREATEST(0, LEAST(1000000, v_referral_code_record.free_credits));
  
  -- Skip if no credits to grant
  IF v_valid_credits <= 0 THEN
    RETURN;
  END IF;

  -- Ensure user has a credits row (in case trigger didn't fire yet)
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, 0, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) DO NOTHING;

  -- Add credits to user
  UPDATE public.user_credits
  SET credits = credits + v_valid_credits,
      updated_at = TIMEZONE('utc', NOW())
  WHERE user_id = p_user_id;

  -- Also update user_profiles with the referral code (atomic operation)
  UPDATE public.user_profiles
  SET referral_code = v_normalized_code
  WHERE user_id = p_user_id;

  RAISE NOTICE 'Granted % referral credits to user % from code %', v_valid_credits, p_user_id, v_normalized_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO anon;
