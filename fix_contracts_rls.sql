-- =====================================================
-- QUICK FIX FOR CONTRACTS TABLE RLS
-- =====================================================
-- Run this in Supabase SQL Editor to fix RLS policies
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow insert contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow update contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow delete contracts" ON public.contracts;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.contracts;
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.contracts;

-- Create simple policies that allow all operations
CREATE POLICY "Allow all operations on contracts"
  ON public.contracts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contracts';

-- Test insert (replace with actual IDs from your database)
-- Uncomment and modify these lines to test:
/*
INSERT INTO public.contracts (
  id,
  type,
  member_id,
  start_date,
  monthly_fee,
  status,
  auto_renew,
  payment_method,
  branch_id,
  created_at
) VALUES (
  'test-contract-' || extract(epoch from now())::text,
  'private-desk',
  (SELECT id FROM members LIMIT 1),
  CURRENT_DATE,
  1000,
  'active',
  false,
  'cash',
  (SELECT id FROM branches WHERE is_active = true LIMIT 1),
  NOW()
)
RETURNING *;
*/


