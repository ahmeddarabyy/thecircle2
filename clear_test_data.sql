-- =====================================================
-- Clear Test Data Script
-- =====================================================
-- This script clears operational/transactional data
-- while preserving reference data (members, companies, services, etc.)
-- Run this in Supabase SQL Editor
-- =====================================================

-- WARNING: This will delete all operational data!
-- Make sure you're in a test/development environment

BEGIN;

-- =====================================================
-- 1. Clear Transactional/Operational Data
-- =====================================================

-- Clear outstanding transactions (must be deleted before visits due to FK)
DELETE FROM public.outstanding_transactions;

-- Clear voided transactions (must be deleted before visits due to FK)
DELETE FROM public.voided_transactions;

-- Clear transaction items (must be deleted before transactions due to FK)
DELETE FROM public.transaction_items;

-- Clear transactions
DELETE FROM public.transactions;

-- Clear visits (check-ins/check-outs)
DELETE FROM public.visits;

-- Clear bookings
DELETE FROM public.bookings;

-- Clear room reservations
DELETE FROM public.room_reservations;

-- Clear invoices
DELETE FROM public.invoices;

-- Clear expenses
DELETE FROM public.expenses;

-- Clear contracts (optional - uncomment if you want to clear contracts too)
-- DELETE FROM public.contracts;

-- =====================================================
-- 2. Optional: Clear Reference Data
-- =====================================================
-- Uncomment the sections below if you want to clear reference data too

-- Clear inventory items
-- DELETE FROM public.inventory_items;

-- Clear rooms
-- DELETE FROM public.rooms;

-- Clear services
-- DELETE FROM public.services;

-- Clear companies
-- DELETE FROM public.companies;

-- Clear members
-- DELETE FROM public.members;

-- Clear branches (keep at least one for testing!)
-- DELETE FROM public.branches;

-- Clear users (keep at least one admin user!)
-- DELETE FROM public.users WHERE username != 'admin';

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these after clearing to verify:

-- SELECT COUNT(*) as visits_count FROM public.visits;
-- SELECT COUNT(*) as bookings_count FROM public.bookings;
-- SELECT COUNT(*) as transactions_count FROM public.transactions;
-- SELECT COUNT(*) as outstanding_count FROM public.outstanding_transactions;
-- SELECT COUNT(*) as voided_count FROM public.voided_transactions;

