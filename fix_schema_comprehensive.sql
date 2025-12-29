    -- Comprehensive Schema Fix
    -- Run this in Supabase SQL Editor to ensure all tables and columns exist
    -- and to reload the schema cache.

    -- 1. COMPANIES
    CREATE TABLE IF NOT EXISTS public.companies (
    id text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contact_email text;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS point_of_contact text;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website text;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employee_ids jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS has_active_contract boolean DEFAULT false;
    ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

    -- 2. BOOKINGS
    CREATE TABLE IF NOT EXISTS public.bookings (
    id text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS date date;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS resource_type text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS resource_id text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booker_type text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booker_id text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booker_name text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed';
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

    -- 3. VISITS
    CREATE TABLE IF NOT EXISTS public.visits (
    id text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS date date;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS check_in_time timestamp with time zone;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS check_out_time timestamp with time zone;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visitor_type text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visitor_id text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visitor_name text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS booking_id text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS status text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS branch_id text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

    -- RELOAD CACHE
NOTIFY pgrst, 'reload schema';

-- 4. ENSURE PERMISSIONS (RLS) - Fix for "Not saving anything"
-- We verify tables are secure but allow public access for this MVP/Refactor stage

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for companies" ON "public"."companies";
CREATE POLICY "Enable all access for companies" ON "public"."companies" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for bookings" ON "public"."bookings";
CREATE POLICY "Enable all access for bookings" ON "public"."bookings" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for visits" ON "public"."visits";
CREATE POLICY "Enable all access for visits" ON "public"."visits" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

