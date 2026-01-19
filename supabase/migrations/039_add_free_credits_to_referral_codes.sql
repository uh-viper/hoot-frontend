-- Add free_credits column to referral_codes table
-- This stores how many free credits users get when they sign up with this referral code

ALTER TABLE public.referral_codes
ADD COLUMN IF NOT EXISTS free_credits INTEGER NOT NULL DEFAULT 0 CHECK (free_credits >= 0);

-- Create index for faster lookups of codes with free credits
CREATE INDEX IF NOT EXISTS idx_referral_codes_free_credits ON public.referral_codes(free_credits) WHERE free_credits > 0;

-- Add comment for clarity
COMMENT ON COLUMN public.referral_codes.free_credits IS 'Number of free credits to grant when a user signs up with this referral code';
