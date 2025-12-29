-- SQL to fix the bookings table schema
-- Run this in the Supabase SQL Editor

-- 1. Ensure the table exists (it does, but good practice)
CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add missing columns safely
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS visitor_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expected_start_time timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS expected_end_time timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status text DEFAULT 'confirmed';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS member_id text; 
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS company_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_booking_hours text; 
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS inventory_items jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;

-- 3. Fix potential legacy constraints
-- "member_name" might exist and be NOT NULL, blocking inserts that use "visitor_name"
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'member_name') THEN
        ALTER TABLE public.bookings ALTER COLUMN member_name DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'date_time') THEN
        ALTER TABLE public.bookings ALTER COLUMN date_time DROP NOT NULL;
    END IF;
END $$;

-- 3. Enable RLS (Optional but recommended)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 4. Create a policy to allow public access (Since we are in development/local mode often)
-- WARNING: For production, you should restrict this!
DROP POLICY IF EXISTS "Enable all access for all users" ON "public"."bookings";

CREATE POLICY "Enable all access for all users" ON "public"."bookings"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
