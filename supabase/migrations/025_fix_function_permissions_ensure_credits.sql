-- Fix add_credits_to_user function permissions
-- Ensure the function can update user_credits even without UPDATE policy
-- SECURITY DEFINER functions run with owner privileges, so we need to ensure owner can UPDATE

-- Drop and recreate the function to ensure it has the latest version
DROP FUNCTION IF EXISTS public.add_credits_to_user(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS public.add_credits_to_user(UUID, INTEGER, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.add_credits_to_user(
  p_user_id UUID,
  p_credits INTEGER,
  p_purchase_id UUID,
  p_payment_intent_id TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_purchase_user_id UUID;
  v_purchase_status TEXT;
  v_purchase_credits INTEGER;
  v_rows_affected INTEGER;
BEGIN
  -- Lock the purchase row and get its details
  SELECT user_id, status, credits
  INTO v_purchase_user_id, v_purchase_status, v_purchase_credits
  FROM public.purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

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

  -- Upsert user credits - CRITICAL: This is where credits get added!
  -- Use INSERT ... ON CONFLICT to handle both new and existing rows
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, v_purchase_credits, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    credits = user_credits.credits + v_purchase_credits,
    updated_at = TIMEZONE('utc', NOW());

  -- Get number of rows affected to verify the update worked
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Failed to update user_credits. No rows affected. User: %, Credits: %', p_user_id, v_purchase_credits;
  END IF;
  
  -- Mark purchase as completed and update payment_intent_id
  UPDATE public.purchases
  SET status = 'completed',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id),
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_purchase_id;
  
  -- Verify purchase was updated
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'Failed to update purchase status. Purchase ID: %', p_purchase_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID, TEXT) TO service_role;

-- CRITICAL: Grant UPDATE permission to postgres role (function owner) on user_credits
-- SECURITY DEFINER functions run as the function owner, so owner needs UPDATE permission
GRANT UPDATE ON public.user_credits TO postgres;
GRANT UPDATE ON public.user_credits TO service_role;

-- Also grant INSERT in case user doesn't have a row yet
GRANT INSERT ON public.user_credits TO postgres;
GRANT INSERT ON public.user_credits TO service_role;
