-- Add payment_intent_id update to add_credits_to_user function
-- This ensures the payment intent is updated atomically with credit addition
-- Also adds payment_intent_id as an optional parameter

DROP FUNCTION IF EXISTS public.add_credits_to_user(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.add_credits_to_user(
  p_user_id UUID,
  p_credits INTEGER,  -- Parameter kept for backward compatibility but not used
  p_purchase_id UUID,
  p_payment_intent_id TEXT DEFAULT NULL  -- Optional: update payment intent if provided
)
RETURNS void AS $$
DECLARE
  v_purchase_user_id UUID;
  v_purchase_status TEXT;
  v_purchase_credits INTEGER;
  v_current_credits INTEGER;
BEGIN
  -- Verify the purchase exists and get its details
  SELECT user_id, status, credits
  INTO v_purchase_user_id, v_purchase_status, v_purchase_credits
  FROM public.purchases
  WHERE id = p_purchase_id;

  -- Validate purchase exists
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

  -- Get current user credits (if exists) for verification
  SELECT credits INTO v_current_credits
  FROM public.user_credits
  WHERE user_id = p_user_id;

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
