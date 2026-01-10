-- Update the upsert_user_profile function to fix parameter handling
-- Drop and recreate to avoid parameter default issues

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
  -- Handle null/empty values: convert empty strings to NULL
  v_full_name := NULLIF(TRIM(COALESCE(p_full_name, '')), '');
  v_email := NULLIF(TRIM(COALESCE(p_email, '')), '');
  v_discord_username := NULLIF(TRIM(COALESCE(p_discord_username, '')), '');

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
