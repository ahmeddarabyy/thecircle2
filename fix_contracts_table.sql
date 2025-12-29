-- =====================================================
-- FIX CONTRACTS TABLE - Ensure private-desk contracts can be saved
-- =====================================================
-- Run this in your Supabase SQL Editor if contracts aren't saving
-- =====================================================

-- First, check if the table exists and drop it if needed (CAREFUL - this deletes data!)
-- Uncomment the next line ONLY if you want to recreate the table from scratch
-- DROP TABLE IF EXISTS public.contracts CASCADE;

-- Create the contracts table with correct schema
CREATE TABLE IF NOT EXISTS public.contracts (
  id text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('private-room-monthly', 'private-desk')),
  company_id text, -- Optional FK to companies (for private-room-monthly)
  member_id text, -- Optional FK to members (for private-desk)
  start_date date NOT NULL, -- YYYY-MM-DD
  end_date date, -- Optional end date (YYYY-MM-DD)
  monthly_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  room_id text, -- Optional FK to rooms (for private-room-monthly)
  auto_renew boolean DEFAULT false,
  payment_method text CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
  notes text,
  branch_id text NOT NULL, -- FK to branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  cancelled_date date, -- When contract was cancelled
  pdf_file_name text, -- Name of uploaded PDF file
  pdf_data text -- Base64 encoded PDF data
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_type ON public.contracts(type);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_member_id ON public.contracts(member_id);
CREATE INDEX IF NOT EXISTS idx_contracts_branch_id ON public.contracts(branch_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON public.contracts(start_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read contracts
CREATE POLICY "Allow read contracts"
  ON public.contracts
  FOR SELECT
  USING (true);

-- Policy: Allow all authenticated users to insert contracts
CREATE POLICY "Allow insert contracts"
  ON public.contracts
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow all authenticated users to update contracts
CREATE POLICY "Allow update contracts"
  ON public.contracts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow all authenticated users to delete contracts
CREATE POLICY "Allow delete contracts"
  ON public.contracts
  FOR DELETE
  USING (true);

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contracts'
ORDER BY ordinal_position;


