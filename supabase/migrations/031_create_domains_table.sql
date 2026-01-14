-- Create domains table for domain management
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name TEXT NOT NULL UNIQUE,
  registrar TEXT NOT NULL DEFAULT 'porkbun',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, error
  cloudflare_zone_id TEXT,
  cloudflare_nameservers TEXT[], -- Array of nameservers
  porkbun_nameservers TEXT[], -- Array of nameservers from Porkbun
  dns_records JSONB DEFAULT '[]'::jsonb, -- Store DNS records as JSON
  mx_priorities JSONB DEFAULT '{"route1": 28, "route2": 28, "route3": 23}'::jsonb, -- Custom MX priorities per domain
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for domain lookups
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON public.domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_domains_status ON public.domains(status);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON public.domains(created_at DESC);

-- Enable RLS
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view all domains
CREATE POLICY "Admins can view all domains" ON public.domains
  FOR SELECT USING (public.is_admin());

-- Policy: Only admins can insert domains
CREATE POLICY "Admins can insert domains" ON public.domains
  FOR INSERT WITH CHECK (public.is_admin());

-- Policy: Only admins can update domains
CREATE POLICY "Admins can update domains" ON public.domains
  FOR UPDATE USING (public.is_admin());

-- Policy: Only admins can delete domains
CREATE POLICY "Admins can delete domains" ON public.domains
  FOR DELETE USING (public.is_admin());

-- Add comment
COMMENT ON TABLE public.domains IS 'Stores domain information for management and DNS configuration';
COMMENT ON COLUMN public.domains.status IS 'Domain status: pending (just added), active (configured), error (configuration failed)';
COMMENT ON COLUMN public.domains.dns_records IS 'JSON array of DNS records for the domain';
