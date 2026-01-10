-- Grant execute permissions on the new add_credits_to_user function signature (with 4 parameters)
-- The function signature changed to include p_payment_intent_id parameter

GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_to_user(UUID, INTEGER, UUID, TEXT) TO service_role;
