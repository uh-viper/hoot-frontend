-- Backfill existing users who don't have credits or stats rows
-- This migration ensures all existing users have the necessary data

-- Insert credits for users who don't have them
INSERT INTO public.user_credits (user_id, credits)
SELECT 
  id as user_id,
  0 as credits
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;

-- Insert stats for users who don't have them
INSERT INTO public.user_stats (user_id, business_centers, requested, successful, failures)
SELECT 
  id as user_id,
  0 as business_centers,
  0 as requested,
  0 as successful,
  0 as failures
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_stats)
ON CONFLICT (user_id) DO NOTHING;
