-- Create purchases table to track Stripe payments
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_paid_cents INTEGER NOT NULL CHECK (amount_paid_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_payment_intent ON public.purchases(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_checkout_session ON public.purchases(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON public.purchases(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own purchases
CREATE POLICY "Users can view their own purchases"
  ON public.purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: For webhook operations, we'll use SECURITY DEFINER functions
-- that bypass RLS. The policies above allow authenticated users to view their purchases.
-- The webhook handler will use service role key and SECURITY DEFINER functions.

-- Function to create purchase record (called from checkout API)
-- This function bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_purchase(
  p_user_id UUID,
  p_stripe_checkout_session_id TEXT,
  p_credits INTEGER,
  p_amount_paid_cents INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_purchase_id UUID;
BEGIN
  INSERT INTO public.purchases (
    user_id,
    stripe_checkout_session_id,
    credits,
    amount_paid_cents,
    status
  )
  VALUES (
    p_user_id,
    p_stripe_checkout_session_id,
    p_credits,
    p_amount_paid_cents,
    'pending'
  )
  RETURNING id INTO v_purchase_id;
  
  RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits to user account after successful purchase
-- This function will be called by the webhook handler
-- It bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.add_credits_to_user(
  p_user_id UUID,
  p_credits INTEGER,
  p_purchase_id UUID
)
RETURNS void AS $$
BEGIN
  -- Update user credits
  UPDATE public.user_credits
  SET credits = credits + p_credits,
      updated_at = TIMEZONE('utc', NOW())
  WHERE user_id = p_user_id;
  
  -- Mark purchase as completed
  UPDATE public.purchases
  SET status = 'completed',
      updated_at = TIMEZONE('utc', NOW())
  WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.purchases TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
