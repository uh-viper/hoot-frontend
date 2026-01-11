-- Create function to deduct credits from a user
-- This function uses SECURITY DEFINER to bypass RLS policies
-- Users can only deduct their own credits and must have enough credits

CREATE OR REPLACE FUNCTION public.deduct_credits_from_user(
  p_user_id UUID,
  p_credits_to_deduct INTEGER
)
RETURNS void AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  -- Security check: Users can only deduct from their own account
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only deduct credits from your own account';
  END IF;

  -- Validate credits to deduct is positive
  IF p_credits_to_deduct IS NULL OR p_credits_to_deduct <= 0 THEN
    RAISE EXCEPTION 'Credits to deduct must be positive. Received: %', p_credits_to_deduct;
  END IF;

  -- Get current user credits
  SELECT credits INTO v_current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id;

  -- Validate user has credits row
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION 'User credits record not found for user: %', p_user_id;
  END IF;

  -- Validate user has enough credits
  IF v_current_credits < p_credits_to_deduct THEN
    RAISE EXCEPTION 'Insufficient credits. Current: %, Required: %', v_current_credits, p_credits_to_deduct;
  END IF;

  -- Deduct credits
  UPDATE public.user_credits
  SET credits = credits - p_credits_to_deduct,
      updated_at = TIMEZONE('utc', NOW())
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_credits_from_user(UUID, INTEGER) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.deduct_credits_from_user(UUID, INTEGER) IS 
'Deducts credits from a user. Users can only deduct from their own account and must have sufficient credits. Uses SECURITY DEFINER to bypass RLS policies.';