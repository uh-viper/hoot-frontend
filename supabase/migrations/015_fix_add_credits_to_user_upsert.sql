-- Fix add_credits_to_user to handle users without a user_credits row
-- Use INSERT ... ON CONFLICT DO UPDATE (upsert) instead of just UPDATE
CREATE OR REPLACE FUNCTION public.add_credits_to_user(
  p_user_id UUID,
  p_credits INTEGER,
  p_purchase_id UUID
)
RETURNS void AS $$
BEGIN
  -- Upsert user credits (insert if doesn't exist, update if it does)
  INSERT INTO public.user_credits (user_id, credits, created_at, updated_at)
  VALUES (p_user_id, p_credits, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    credits = user_credits.credits + p_credits,
    updated_at = TIMEZONE('utc', NOW());
  
  -- Mark purchase as completed
  UPDATE public.purchases
  SET status = 'completed',
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
