-- =====================================================
-- CONTRACT RENEWALS TABLE
-- Tracks monthly contract renewals and revenue
-- =====================================================

CREATE TABLE IF NOT EXISTS public.contract_renewals (
  id text PRIMARY KEY,
  contract_id text NOT NULL, -- FK to contracts
  renewal_date date NOT NULL, -- Date of this renewal (YYYY-MM-DD)
  renewal_month integer NOT NULL, -- Month number (1-12)
  renewal_year integer NOT NULL, -- Year (e.g., 2025)
  amount numeric NOT NULL DEFAULT 0, -- Monthly fee amount
  payment_method text CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
  transaction_id text, -- Optional FK to transactions (for revenue tracking)
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
  branch_id text NOT NULL, -- FK to branches
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone,
  
  -- Ensure one renewal per contract per month
  UNIQUE(contract_id, renewal_month, renewal_year)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract_id ON public.contract_renewals(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_renewals_date ON public.contract_renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_contract_renewals_month_year ON public.contract_renewals(renewal_month, renewal_year);

-- Add foreign key constraint
ALTER TABLE public.contract_renewals 
  ADD CONSTRAINT fk_contract_renewals_contract 
  FOREIGN KEY (contract_id) 
  REFERENCES public.contracts(id) 
  ON DELETE CASCADE;

-- Add contract_id to transactions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN contract_id text;
    ALTER TABLE public.transactions 
      ADD CONSTRAINT fk_transactions_contract 
      FOREIGN KEY (contract_id) 
      REFERENCES public.contracts(id) 
      ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON public.transactions(contract_id);
  END IF;
END $$;

-- RLS Policies
ALTER TABLE public.contract_renewals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for contract_renewals" ON public.contract_renewals;
CREATE POLICY "Enable all access for contract_renewals" ON public.contract_renewals
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Function to get the last renewal date for a contract
CREATE OR REPLACE FUNCTION get_last_renewal_date(p_contract_id text)
RETURNS date AS $$
DECLARE
  last_renewal_date date;
BEGIN
  SELECT MAX(renewal_date) INTO last_renewal_date
  FROM public.contract_renewals
  WHERE contract_id = p_contract_id;
  
  -- If no renewals exist, return the contract start date
  IF last_renewal_date IS NULL THEN
    SELECT start_date INTO last_renewal_date
    FROM public.contracts
    WHERE id = p_contract_id;
  END IF;
  
  RETURN last_renewal_date;
END;
$$ LANGUAGE plpgsql;

-- Function to check if contract needs renewal for a given month/year
CREATE OR REPLACE FUNCTION contract_needs_renewal(
  p_contract_id text,
  p_month integer,
  p_year integer
)
RETURNS boolean AS $$
DECLARE
  contract_record RECORD;
  renewal_exists boolean;
BEGIN
  -- Get contract details
  SELECT * INTO contract_record
  FROM public.contracts
  WHERE id = p_contract_id;
  
  -- Contract must exist, be active, and have auto_renew enabled
  IF contract_record IS NULL OR 
     contract_record.status != 'active' OR 
     contract_record.auto_renew != true THEN
    RETURN false;
  END IF;
  
  -- Check if renewal already exists for this month/year
  SELECT EXISTS(
    SELECT 1 FROM public.contract_renewals
    WHERE contract_id = p_contract_id
      AND renewal_month = p_month
      AND renewal_year = p_year
  ) INTO renewal_exists;
  
  -- If renewal exists, doesn't need renewal
  IF renewal_exists THEN
    RETURN false;
  END IF;
  
  -- Check if contract start date is before or in the renewal month
  IF contract_record.start_date > make_date(p_year, p_month, 1) THEN
    RETURN false;
  END IF;
  
  -- Check if contract has end date and if renewal month is after end date
  IF contract_record.end_date IS NOT NULL AND 
     make_date(p_year, p_month, 1) > contract_record.end_date THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;


