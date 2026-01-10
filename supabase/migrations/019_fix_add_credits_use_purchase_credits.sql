-- Fix add_credits_to_user to always use credits from purchase record (source of truth)
-- This prevents issues where session metadata credits might not match purchase record
-- The purchase record is created first, so it's the authoritative source

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

  -- IMPORTANT: Always use credits from purchase record (source of truth)
  -- Ignore p_credits parameter and use what's actually stored in the database
  -- This prevents any manipulation or mismatch issues
  -- The purchase record is created first with the correct credits, so it's authoritative

  -- Upsert user credits (insert if doesn't exist, update if it does)
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, v_purchase_credits, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    credits = user_credits.credits + v_purchase_credits,
    updated_at = TIMEZONE('utc', NOW());
  
  -- Mark purchase as completed (prevents duplicate processing)
  UPDATE public.purchases
  SET status = 'completed',
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
