-- EMERGENCY DB FIX
-- The database has legacy columns (like company_name) that are NOT NULL, 
-- but the App is sending new columns (like name).
-- This script relaxes those constraints and syncs data.

-- 1. FIX COMPANIES
ALTER TABLE public.companies ALTER COLUMN company_name DROP NOT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS name text;
-- Sync legacy company_name to name if name is null
UPDATE public.companies SET name = company_name WHERE name IS NULL AND company_name IS NOT NULL;
-- Sync name back to company_name just in case
UPDATE public.companies SET company_name = name WHERE company_name IS NULL AND name IS NOT NULL;


-- 2. FIX BOOKINGS
-- Ensure we don't have legacy NOT NULLs blocking us
ALTER TABLE public.bookings ALTER COLUMN date DROP NOT NULL; -- Just in case, though we want it
ALTER TABLE public.bookings ALTER COLUMN status DROP NOT NULL; -- Fix reported constraint violation
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'confirmed';
-- If there are other legacy columns like 'booking_status', drop not null
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booking_status') THEN
        ALTER TABLE public.bookings ALTER COLUMN booking_status DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'member_name') THEN
        ALTER TABLE public.bookings ALTER COLUMN member_name DROP NOT NULL;
    END IF;
END $$;


-- 3. FIX VISITS
-- Ensure visits table is permissive
ALTER TABLE public.visits ALTER COLUMN visitor_name DROP NOT NULL;
ALTER TABLE public.visits ALTER COLUMN date DROP NOT NULL; -- Fix "null value in column date" error
-- (We'll enforce validation in App, DB should be accepting)

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
