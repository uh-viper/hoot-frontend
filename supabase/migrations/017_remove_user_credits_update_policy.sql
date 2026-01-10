-- Remove the UPDATE policy for user_credits to prevent direct credit modifications
-- Credits should ONLY be modified through RPC functions (add_credits_to_user) which have proper validation
-- This prevents users from directly updating their credits through Supabase client

-- Drop the policy that allows users to update their own credits
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- Remove UPDATE permission (keep SELECT for users to view their credits)
REVOKE UPDATE ON public.user_credits FROM authenticated;

-- Only admin/service role can update credits now
-- Regular users can only view (SELECT) their credits
-- Credits can only be modified through RPC functions like add_credits_to_user
