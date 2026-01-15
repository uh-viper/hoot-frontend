-- Add expected_hours column to maintenance_mode table
ALTER TABLE public.maintenance_mode 
ADD COLUMN IF NOT EXISTS expected_hours NUMERIC(5, 2);

-- Migrate existing expected_time to expected_hours if it exists
-- Calculate hours from expected_time and updated_at
UPDATE public.maintenance_mode
SET expected_hours = EXTRACT(EPOCH FROM (expected_time - updated_at)) / 3600
WHERE expected_time IS NOT NULL 
  AND updated_at IS NOT NULL 
  AND expected_hours IS NULL;
