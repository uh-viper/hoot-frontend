-- Backfill existing users who don't have user_profiles rows
-- This migration ensures all existing users have user_profiles entries
-- Uses SECURITY DEFINER to bypass RLS for this operation

-- Create or replace function to ensure user_profiles exists (for future use)
-- This function can be called from the app to ensure a user has a profile
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_uuid UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email, discord_username)
  SELECT 
    au.id,
    au.raw_user_meta_data->>'full_name',
    au.email,
    au.raw_user_meta_data->>'discord_username'
  FROM auth.users au
  WHERE au.id = user_uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = au.id
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;

-- Backfill all existing users who don't have profiles
-- This runs as the migration user (bypasses RLS)
INSERT INTO public.user_profiles (user_id, full_name, email, discord_username)
SELECT 
  au.id as user_id,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.email,
  au.raw_user_meta_data->>'discord_username' as discord_username
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;
