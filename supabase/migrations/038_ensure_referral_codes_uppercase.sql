-- Create function to normalize referral codes to uppercase
CREATE OR REPLACE FUNCTION public.normalize_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize code to uppercase and remove non-alphanumeric characters
  IF NEW.code IS NOT NULL THEN
    NEW.code = UPPER(REGEXP_REPLACE(NEW.code, '[^A-Z0-9]', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to normalize referral codes on insert
DROP TRIGGER IF EXISTS normalize_referral_code_on_insert ON public.referral_codes;
CREATE TRIGGER normalize_referral_code_on_insert
  BEFORE INSERT ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_referral_code();

-- Create trigger to normalize referral codes on update
DROP TRIGGER IF EXISTS normalize_referral_code_on_update ON public.referral_codes;
CREATE TRIGGER normalize_referral_code_on_update
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  WHEN (OLD.code IS DISTINCT FROM NEW.code)
  EXECUTE FUNCTION public.normalize_referral_code();

-- Normalize existing referral codes in the database
UPDATE public.referral_codes
SET code = UPPER(REGEXP_REPLACE(code, '[^A-Z0-9]', '', 'g'))
WHERE code != UPPER(REGEXP_REPLACE(code, '[^A-Z0-9]', '', 'g'));

-- Normalize existing referral codes in user_profiles
UPDATE public.user_profiles
SET referral_code = UPPER(REGEXP_REPLACE(referral_code, '[^A-Z0-9]', '', 'g'))
WHERE referral_code IS NOT NULL
  AND referral_code != UPPER(REGEXP_REPLACE(referral_code, '[^A-Z0-9]', '', 'g'));
