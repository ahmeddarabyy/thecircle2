-- =====================================================
-- Clear ALL Data Script (Nuclear Option)
-- =====================================================
-- WARNING: This will delete EVERYTHING except users
-- Use only if you want a completely fresh start
-- =====================================================

BEGIN;

-- Clear all transactional/operational data
DELETE FROM public.outstanding_transactions;
DELETE FROM public.voided_transactions;
DELETE FROM public.transaction_items;
DELETE FROM public.transactions;
DELETE FROM public.visits;
DELETE FROM public.bookings;
DELETE FROM public.room_reservations;
DELETE FROM public.invoices;
DELETE FROM public.expenses;
DELETE FROM public.contracts;

-- Clear all reference data
DELETE FROM public.inventory_items;
DELETE FROM public.rooms;
DELETE FROM public.services;
DELETE FROM public.companies;
DELETE FROM public.members;
DELETE FROM public.branches;

-- Keep users (you'll need at least one admin to log in)
-- Uncomment the line below if you want to clear users too (not recommended)
-- DELETE FROM public.users;

COMMIT;

-- =====================================================
-- After clearing, you may want to:
-- =====================================================
-- 1. Create a test branch
-- INSERT INTO public.branches (id, name, address, is_active) 
-- VALUES ('branch-1', 'Main Branch', '123 Test St', true);

-- 2. Create test services
-- INSERT INTO public.services (id, name, price, branch_id, available_for_members, available_for_companies)
-- VALUES 
--   ('service-1', 'Day Pass', 100, 'branch-1', true, true),
--   ('service-2', 'Shift Pass', 50, 'branch-1', true, true),
--   ('service-3', 'Water', 10, 'branch-1', true, true);

-- 3. Create test members
-- INSERT INTO public.members (id, full_name, email, phone_number)
-- VALUES 
--   ('member-1', 'Test Member', 'test@example.com', '1234567890');

-- 4. Create test rooms
-- INSERT INTO public.rooms (id, name, capacity, branch_id)
-- VALUES 
--   ('room-1', 'Conference Room A', 10, 'branch-1'),
--   ('room-2', 'Private Office 1', 4, 'branch-1');

