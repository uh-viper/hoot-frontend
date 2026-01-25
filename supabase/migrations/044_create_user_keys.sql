-- Create user_keys table to store API keys for user authentication
-- SECURITY: Only one API key per user (enforced by UNIQUE constraint on user_id)
CREATE TABLE IF NOT EXISTS public.user_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_keys_user_id ON public.user_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keys_api_key ON public.user_keys(api_key);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_user_keys_updated_at
  BEFORE UPDATE ON public.user_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own API keys
CREATE POLICY "Users can view their own API keys"
  ON public.user_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own API keys
CREATE POLICY "Users can insert their own API keys"
  ON public.user_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own API keys (for last_used_at)
CREATE POLICY "Users can update their own API keys"
  ON public.user_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
  ON public.user_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comment on table
COMMENT ON TABLE public.user_keys IS 'Stores API keys for user authentication. Each user can have only ONE API key (enforced by UNIQUE constraint on user_id). Users can regenerate their key, which deletes the old one.';
COMMENT ON COLUMN public.user_keys.user_id IS 'User ID - UNIQUE constraint ensures only one API key per user';
COMMENT ON COLUMN public.user_keys.key_name IS 'User-friendly name for the API key (e.g., "Production API", "Test Integration")';
COMMENT ON COLUMN public.user_keys.api_key IS 'The actual API key token (format: hoot_<64 hex chars>). Used for authentication.';
COMMENT ON COLUMN public.user_keys.last_used_at IS 'Timestamp of when this API key was last used for authentication';
