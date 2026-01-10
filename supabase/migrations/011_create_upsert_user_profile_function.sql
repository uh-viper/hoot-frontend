-- Create a function to upsert user profile that bypasses RLS
-- This function can be called from the app to safely create/update profiles
-- Uses SECURITY DEFINER to bypass RLS policies

CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_discord_username TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email, discord_username)
  VALUES (p_user_id, NULLIF(p_full_name, ''), NULLIF(p_email, ''), NULLIF(p_discord_username, ''))
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
    email = COALESCE(NULLIF(EXCLUDED.email, ''), user_profiles.email),
    discord_username = COALESCE(NULLIF(EXCLUDED.discord_username, ''), user_profiles.discord_username),
    updated_at = TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO service_role;
