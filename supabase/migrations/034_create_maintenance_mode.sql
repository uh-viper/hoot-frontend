-- Create maintenance_mode table to control site-wide maintenance
CREATE TABLE IF NOT EXISTS public.maintenance_mode (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  expected_time TIMESTAMP WITH TIME ZONE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Only allow one row (singleton pattern)
INSERT INTO public.maintenance_mode (id, enabled, expected_time, message)
VALUES ('00000000-0000-0000-0000-000000000000', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Add unique constraint to ensure only one row
ALTER TABLE public.maintenance_mode ADD CONSTRAINT maintenance_mode_singleton CHECK (id = '00000000-0000-0000-0000-000000000000');

-- Enable Row Level Security
ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read maintenance mode (needed for middleware)
CREATE POLICY "Anyone can view maintenance mode"
  ON public.maintenance_mode
  FOR SELECT
  USING (true);

-- Only admins can update maintenance mode
CREATE POLICY "Admins can update maintenance mode"
  ON public.maintenance_mode
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant permissions
GRANT SELECT ON public.maintenance_mode TO anon, authenticated;
GRANT UPDATE ON public.maintenance_mode TO authenticated;

-- Create trigger to update updated_at (function should already exist from previous migrations)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_maintenance_mode_updated_at'
  ) THEN
    CREATE TRIGGER update_maintenance_mode_updated_at
      BEFORE UPDATE ON public.maintenance_mode
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
