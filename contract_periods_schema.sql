-- =====================================================
-- CONTRACT PERIODS TABLE
-- Tracks individual monthly periods within a parent contract
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contract_periods (
  id text PRIMARY KEY,
  contract_id text NOT NULL, -- FK to contracts (parent contract)
  period_month integer NOT NULL, -- Month number (1-12)
  period_year integer NOT NULL, -- Year (e.g., 2025)
  period_name text NOT NULL, -- e.g., "January 2025"
  amount numeric NOT NULL DEFAULT 0, -- Monthly fee amount (from parent contract)
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'pending')),
  invoice_sent boolean DEFAULT false,
  paid_date date, -- Date when payment was received
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone,
  
  -- Ensure one period per contract per month/year
  UNIQUE(contract_id, period_month, period_year)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contract_periods_contract_id ON public.contract_periods(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_periods_date ON public.contract_periods(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_contract_periods_payment_status ON public.contract_periods(payment_status);

-- Add foreign key constraint
ALTER TABLE public.contract_periods 
  ADD CONSTRAINT fk_contract_periods_contract 
  FOREIGN KEY (contract_id) 
  REFERENCES public.contracts(id) 
  ON DELETE CASCADE;

-- Update contracts table to remove parent_contract_id (not needed anymore)
-- Keep payment_status and invoice_sent for backward compatibility, but they won't be used for periods

-- RLS Policies
ALTER TABLE public.contract_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for contract_periods" ON public.contract_periods;
CREATE POLICY "Enable all access for contract_periods" ON public.contract_periods
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

