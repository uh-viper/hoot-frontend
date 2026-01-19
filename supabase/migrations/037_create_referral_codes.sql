-- Create referral_codes table to store referral codes managed by admins
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_is_active ON public.referral_codes(is_active);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can view active referral codes (needed for validation during signup)
CREATE POLICY "Anyone can view active referral codes"
  ON public.referral_codes
  FOR SELECT
  USING (is_active = true);

-- Create policy: Admins can view all referral codes
CREATE POLICY "Admins can view all referral codes"
  ON public.referral_codes
  FOR SELECT
  USING (public.is_admin());

-- Create policy: Admins can insert referral codes
CREATE POLICY "Admins can insert referral codes"
  ON public.referral_codes
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Create policy: Admins can update referral codes
CREATE POLICY "Admins can update referral codes"
  ON public.referral_codes
  FOR UPDATE
  USING (public.is_admin());

-- Create policy: Admins can delete referral codes
CREATE POLICY "Admins can delete referral codes"
  ON public.referral_codes
  FOR DELETE
  USING (public.is_admin());

-- Grant necessary permissions
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referral_codes TO anon;
GRANT INSERT, UPDATE, DELETE ON public.referral_codes TO authenticated;

-- Add referral_code column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Create index for referral_code lookups (for analytics filtering)
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);

-- Add comment for clarity
COMMENT ON TABLE public.referral_codes IS 'Stores referral codes that users can use during signup';
COMMENT ON COLUMN public.user_profiles.referral_code IS 'The referral code used by this user during signup';
