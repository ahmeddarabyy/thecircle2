-- =====================================================
-- Seed Test Data Script
-- =====================================================
-- Creates basic test data for development/testing
-- Run this AFTER clearing data if you want sample data
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Create Test Branch
-- =====================================================
INSERT INTO public.branches (id, name, address, phone_number, email, is_active)
VALUES 
  ('branch-1', 'Main Branch', '123 Test Street', '1234567890', 'main@test.com', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Create Test Services
-- =====================================================
INSERT INTO public.services (id, name, price, branch_id, available_for_members, available_for_companies, description)
VALUES 
  ('service-day-pass', 'Day Pass', 100, 'branch-1', true, true, 'Full day access'),
  ('service-shift-pass', 'Shift Pass', 50, 'branch-1', true, true, 'Half day access'),
  ('service-water', 'Water', 10, 'branch-1', true, true, 'Bottled water'),
  ('service-coffee', 'Coffee', 15, 'branch-1', true, true, 'Coffee'),
  ('service-hourly-room', 'Private Hourly Room', 250, 'branch-1', true, true, 'Private room per hour')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. Create Test Members
-- =====================================================
INSERT INTO public.members (id, full_name, email, phone_number, occupation)
VALUES 
  ('member-1', 'John Doe', 'john@test.com', '1234567890', 'Developer'),
  ('member-2', 'Jane Smith', 'jane@test.com', '0987654321', 'Designer'),
  ('member-3', 'Bob Johnson', 'bob@test.com', '1122334455', 'Manager')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. Create Test Companies
-- =====================================================
INSERT INTO public.companies (id, name, contact_email, phone, point_of_contact)
VALUES 
  ('company-1', 'Test Company Inc', 'contact@testcompany.com', '5551234567', 'Alice Manager')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. Create Test Rooms
-- =====================================================
INSERT INTO public.rooms (id, name, capacity, branch_id)
VALUES 
  ('room-1', 'Conference Room A', 10, 'branch-1'),
  ('room-2', 'Conference Room B', 8, 'branch-1'),
  ('room-3', 'Private Office 1', 4, 'branch-1'),
  ('room-4', 'Private Office 2', 6, 'branch-1')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. Create Test Inventory Items
-- =====================================================
INSERT INTO public.inventory_items (id, name, current_stock, unit, low_stock_threshold, branch_id)
VALUES 
  ('inv-water', 'Water Bottles', 100, 'bottle', 20, 'branch-1'),
  ('inv-coffee', 'Coffee', 50, 'pack', 10, 'branch-1')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================
-- Run these to verify data was created:

-- SELECT * FROM public.branches;
-- SELECT * FROM public.services;
-- SELECT * FROM public.members;
-- SELECT * FROM public.companies;
-- SELECT * FROM public.rooms;
-- SELECT * FROM public.inventory_items;

