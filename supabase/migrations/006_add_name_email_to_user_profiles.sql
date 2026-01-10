-- Add name and email columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on email for faster lookups (optional, but useful)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Migrate existing data from user_metadata to user_profiles
-- This updates existing profiles with data from auth.users
UPDATE public.user_profiles up
SET 
  full_name = COALESCE(up.full_name, au.raw_user_meta_data->>'full_name'),
  email = COALESCE(up.email, au.email)
FROM auth.users au
WHERE up.user_id = au.id
AND (up.full_name IS NULL OR up.email IS NULL);

-- Update handle_new_user function to also save name and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_stats (user_id, business_centers, requested, successful, failures)
  VALUES (NEW.id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_profiles (user_id, discord_username, full_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'discord_username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
