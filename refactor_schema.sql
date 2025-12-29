-- Refactor Schema SQL
-- Run this in the Supabase SQL Editor

-- 1. COMPANIES Table
CREATE TABLE IF NOT EXISTS public.companies (
  id text PRIMARY KEY, -- or uuid
  name text NOT NULL,
  contact_email text,
  phone text,
  address text,
  point_of_contact text,
  website text,
  employee_ids jsonb DEFAULT '[]'::jsonb, -- Array of member IDs
  has_active_contract boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for companies" ON "public"."companies";
CREATE POLICY "Enable all access for companies" ON "public"."companies"
AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);


-- 2. BOOKINGS Table (Refactor to strictly "Advance Intent")
-- We will keep the existing table but ensure columns align with the new plan.
-- If you want a fresh start, you could DROP it, but we'll alter it to be safe.

CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS date date; -- The specific day of booking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time text; -- "10:00 AM"
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time text; -- "02:00 PM"
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS resource_type text; -- 'desk' | 'room'
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS resource_id text; -- FK to Room
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booker_type text; -- 'member' | 'company' | 'visitor'
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booker_id text; 
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booker_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed'; -- 'confirmed', 'cancelled', 'no-show', 'converted_to_visit'
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for bookings" ON "public"."bookings";
CREATE POLICY "Enable all access for bookings" ON "public"."bookings"
AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);


-- 3. VISITS Table (New! Replaces generic check_ins for Operations)
CREATE TABLE IF NOT EXISTS public.visits (
  id text PRIMARY KEY,
  date date NOT NULL,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  visitor_type text, -- 'member' | 'company' | 'visitor'
  visitor_id text,
  visitor_name text NOT NULL,
  booking_id text, -- Link to original booking if converted
  services jsonb DEFAULT '[]'::jsonb, -- Store price, qty, payment status here
  status text NOT NULL, -- 'checked-in', 'checked-out', 'outstanding', 'voided'
  payment_status text DEFAULT 'unpaid', -- 'paid', 'partial', 'unpaid'
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  branch_id text,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for visits" ON "public"."visits";
CREATE POLICY "Enable all access for visits" ON "public"."visits"
AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
