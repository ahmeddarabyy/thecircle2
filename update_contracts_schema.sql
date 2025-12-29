-- Add new columns to contracts table for payment and invoice tracking
-- Run this in Supabase SQL Editor

-- Add parent_contract_id for linking renewals to original contract
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS parent_contract_id text;

-- Add payment_status column
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'pending'));

-- Add invoice_sent column
ALTER TABLE public.contracts 
  ADD COLUMN IF NOT EXISTS invoice_sent boolean DEFAULT false;

-- Add index for parent_contract_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_contracts_parent_contract_id ON public.contracts(parent_contract_id);

-- Add foreign key constraint for parent_contract_id
ALTER TABLE public.contracts 
  ADD CONSTRAINT fk_contracts_parent_contract 
  FOREIGN KEY (parent_contract_id) 
  REFERENCES public.contracts(id) 
  ON DELETE SET NULL;
