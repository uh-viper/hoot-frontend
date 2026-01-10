-- Update handle_new_user function to include full_name and email in user_profiles
-- This ensures new signups get complete profile data from the start
-- IMPORTANT: When adding new user-related tables in the future, update this function

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user_credits entry
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user_stats entry
  INSERT INTO public.user_stats (user_id, business_centers, requested, successful, failures)
  VALUES (NEW.id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user_profiles entry with all data
  INSERT INTO public.user_profiles (user_id, full_name, email, discord_username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'discord_username'
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
