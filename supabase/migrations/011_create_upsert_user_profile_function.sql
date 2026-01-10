-- Create a function to upsert user profile that bypasses RLS
-- This function can be called from the app to safely create/update profiles
-- Uses SECURITY DEFINER to bypass RLS policies

CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_discord_username TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email, discord_username)
  VALUES (p_user_id, p_full_name, p_email, p_discord_username)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    discord_username = COALESCE(EXCLUDED.discord_username, user_profiles.discord_username),
    updated_at = TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
