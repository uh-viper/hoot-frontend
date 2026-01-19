-- Create function to grant referral credits during signup
-- This function uses SECURITY DEFINER to bypass RLS policies
-- since regular users can't UPDATE user_credits directly

CREATE OR REPLACE FUNCTION public.grant_referral_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_referral_code TEXT
)
RETURNS void AS $$
DECLARE
  v_current_credits INTEGER;
  v_valid_credits INTEGER;
BEGIN
  -- Validate credits (must be between 0 and 1,000,000)
  v_valid_credits := GREATEST(0, LEAST(1000000, p_credits));
  
  -- Skip if no credits to grant
  IF v_valid_credits <= 0 THEN
    RETURN;
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
  RAISE NOTICE 'Granted % referral credits to user % from code %', v_valid_credits, p_user_id, p_referral_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (needed during signup)
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO authenticated;

-- Grant to service_role as well
GRANT EXECUTE ON FUNCTION public.grant_referral_credits(UUID, INTEGER, TEXT) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.grant_referral_credits IS 'Grants free credits from referral codes during signup. Uses SECURITY DEFINER to bypass RLS.';
