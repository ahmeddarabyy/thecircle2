-- =====================================================
-- TEST CONTRACT INSERT - Run this in Supabase SQL Editor
-- =====================================================
-- This will help verify if the table exists and if inserts work

-- 1. Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'contracts'
);

-- 2. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contracts'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'contracts';

-- 4. Try a test insert (this should work if everything is set up correctly)
-- Replace 'test-branch-id' with an actual branch ID from your branches table
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
  (SELECT id FROM members LIMIT 1), -- Use first member if exists
  CURRENT_DATE,
  1000,
  'active',
  false,
  'cash',
  (SELECT id FROM branches WHERE is_active = true LIMIT 1), -- Use first active branch
  NOW()
)
RETURNING *;

-- 5. Check if the test insert worked
SELECT * FROM public.contracts WHERE id LIKE 'test-contract-%' ORDER BY created_at DESC LIMIT 5;

-- 6. Clean up test data (optional)
-- DELETE FROM public.contracts WHERE id LIKE 'test-contract-%';


