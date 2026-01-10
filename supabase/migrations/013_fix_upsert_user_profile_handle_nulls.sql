-- Fix upsert_user_profile function to properly handle null values
-- Drop and recreate with proper null handling

DROP FUNCTION IF EXISTS public.upsert_user_profile(UUID, TEXT, TEXT, TEXT);

CREATE FUNCTION public.upsert_user_profile(
  p_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_discord_username TEXT
)
RETURNS void AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_discord_username TEXT;
BEGIN
  -- Handle null/empty values: convert empty strings to NULL, keep nulls as null
  v_full_name := CASE WHEN p_full_name IS NULL OR TRIM(p_full_name) = '' THEN NULL ELSE TRIM(p_full_name) END;
  v_email := CASE WHEN p_email IS NULL OR TRIM(p_email) = '' THEN NULL ELSE TRIM(p_email) END;
  v_discord_username := CASE WHEN p_discord_username IS NULL OR TRIM(p_discord_username) = '' THEN NULL ELSE TRIM(p_discord_username) END;

  INSERT INTO public.user_profiles (user_id, full_name, email, discord_username)
  VALUES (p_user_id, v_full_name, v_email, v_discord_username)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = COALESCE(v_full_name, user_profiles.full_name),
    email = COALESCE(v_email, user_profiles.email),
    discord_username = COALESCE(v_discord_username, user_profiles.discord_username),
    updated_at = TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
