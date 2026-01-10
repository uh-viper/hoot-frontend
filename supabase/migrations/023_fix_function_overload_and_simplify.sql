-- Fix add_credits_to_user function - simplified version that always works
-- Drop all existing versions first
DROP FUNCTION IF EXISTS public.add_credits_to_user(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS public.add_credits_to_user(UUID, INTEGER, UUID, TEXT);

-- Create simplified function with 4 parameters (default for 4th parameter allows 3-param calls)
CREATE OR REPLACE FUNCTION public.add_credits_to_user(
  p_user_id UUID,
  p_credits INTEGER,  -- Parameter kept for backward compatibility but not used in logic
  p_purchase_id UUID,
  p_payment_intent_id TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_purchase_user_id UUID;
  v_purchase_status TEXT;
  v_purchase_credits INTEGER;
BEGIN
  -- Verify the purchase exists and get its details (use FOR UPDATE to lock row)
  SELECT user_id, status, credits
  INTO STRICT v_purchase_user_id, v_purchase_status, v_purchase_credits
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  -- Validate purchase exists (STRICT will raise exception if not found, but we check anyway)
  IF v_purchase_user_id IS NULL THEN
    RAISE EXCEPTION 'Purchase record not found: %', p_purchase_id;
  END IF;

  -- Validate purchase belongs to the user
  IF v_purchase_user_id != p_user_id THEN
    RAISE EXCEPTION 'Purchase does not belong to user. Purchase user: %, Provided user: %', v_purchase_user_id, p_user_id;
  END IF;

  -- Validate purchase is pending (prevents duplicate processing)
  IF v_purchase_status != 'pending' THEN
    RAISE EXCEPTION 'Purchase already processed. Current status: % (purchase_id: %)', v_purchase_status, p_purchase_id;
  END IF;

  -- Validate purchase has credits
  IF v_purchase_credits IS NULL OR v_purchase_credits <= 0 THEN
    RAISE EXCEPTION 'Invalid credits in purchase record: % (purchase_id: %)', v_purchase_credits, p_purchase_id;
  END IF;

  -- Upsert user credits (insert if doesn't exist, update if it does)
  -- ALWAYS use credits from purchase record (source of truth)
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, v_purchase_credits, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    credits = user_credits.credits + v_purchase_credits,
    updated_at = TIMEZONE('utc', NOW());
  
  -- Mark purchase as completed and update payment_intent_id in same transaction
  -- This ensures atomicity - either everything succeeds or nothing does
  UPDATE public.purchases
  SET status = 'completed',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions (both 3-param and 4-param calls will work due to DEFAULT)
GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID, TEXT) TO service_role;
