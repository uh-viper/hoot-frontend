-- Add is_admin field to user_profiles table for admin access control
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index on is_admin for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin) WHERE is_admin = true;

-- Add comment to column
COMMENT ON COLUMN public.user_profiles.is_admin IS 'Indicates if the user has admin privileges';

-- Note: To grant admin access to a user, run:
-- UPDATE public.user_profiles SET is_admin = true WHERE user_id = '<user_id>';
-- 
-- Or by email (assuming email is in auth.users):
-- UPDATE public.user_profiles 
-- SET is_admin = true 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = '<email>');
