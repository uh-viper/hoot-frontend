-- Remove key_name column from user_keys table
-- API keys no longer have names, just the key itself

-- Drop the column if it exists
ALTER TABLE public.user_keys DROP COLUMN IF EXISTS key_name;

-- Update comment
COMMENT ON TABLE public.user_keys IS 'Stores API keys for user authentication. Each user can have only ONE API key (enforced by UNIQUE constraint on user_id). Users can regenerate their key, which deletes the old one.';
COMMENT ON COLUMN public.user_keys.api_key IS 'The actual API key token (70 random characters). Used for authentication.';
