-- Add validation to add_credits_to_user function to verify purchase exists and matches user
-- This prevents adding credits without a valid, pending purchase record

CREATE OR REPLACE FUNCTION public.add_credits_to_user(
  p_user_id UUID,
  p_credits INTEGER,
  p_purchase_id UUID
)
RETURNS void AS $$
DECLARE
  v_purchase_user_id UUID;
  v_purchase_status TEXT;
  v_purchase_credits INTEGER;
BEGIN
  -- Verify the purchase exists and belongs to the user
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
    RAISE EXCEPTION 'Purchase already processed. Current status: %', v_purchase_status;
  END IF;

  -- Validate credits match (prevents credit amount manipulation)
  IF v_purchase_credits != p_credits THEN
    RAISE EXCEPTION 'Credits mismatch. Purchase credits: %, Provided credits: %', v_purchase_credits, p_credits;
  END IF;

  -- Upsert user credits (insert if doesn't exist, update if it does)
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, p_credits, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    credits = user_credits.credits + p_credits,
    updated_at = TIMEZONE('utc', NOW());
  
  -- Mark purchase as completed (prevents duplicate processing)
  UPDATE public.purchases
  SET status = 'completed',
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
