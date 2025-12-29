-- =====================================================
-- Coworking Space Management App - Complete Database Schema
-- =====================================================
-- This schema is designed for Supabase/PostgreSQL
-- Run this in the Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. USERS TABLE (Authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL, -- In production, use proper hashing
  role text NOT NULL CHECK (role IN ('admin', 'front-desk')),
  full_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 2. BRANCHES TABLE (Multiple Locations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id text PRIMARY KEY,
  name text NOT NULL,
  address text,
  phone_number text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 3. MEMBERS TABLE (Individual Members)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.members (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  occupation text,
  phone_number text,
  email text,
  referral_source text,
  company_id text, -- Optional FK to companies
  has_active_contract boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 4. COMPANIES TABLE (Company Records)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_email text,
  phone text,
  point_of_contact text,
  employee_ids jsonb DEFAULT '[]'::jsonb, -- Array of member IDs
  has_active_contract boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 5. ROOMS TABLE (Rooms at Branches)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  branch_id text NOT NULL, -- FK to branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 6. INVENTORY ITEMS TABLE (Inventory Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  current_stock numeric DEFAULT 0,
  unit text NOT NULL, -- e.g., "bottle", "pack", "bag", "roll"
  low_stock_threshold numeric DEFAULT 0,
  branch_id text, -- Optional - if NULL, item is shared across branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 7. SERVICES TABLE (Available Services)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.services (
  id text PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  available_for_members boolean DEFAULT true,
  available_for_companies boolean DEFAULT true,
  type text NOT NULL CHECK (type IN ('one-time', 'contract')),
  branch_id text, -- Optional - if NULL, service available at all branches
  inventory_item_id text, -- Optional FK to inventory_items
  inventory_quantity_per_sale numeric DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 8. BOOKINGS TABLE (Advance Reservations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  date date NOT NULL, -- YYYY-MM-DD
  start_time text NOT NULL, -- "10:00 AM" format
  end_time text NOT NULL, -- "02:00 PM" format
  resource_type text NOT NULL CHECK (resource_type IN ('desk', 'room')),
  resource_id text, -- FK to rooms (if resource_type is 'room')
  booker_type text NOT NULL CHECK (booker_type IN ('member', 'company', 'visitor')),
  booker_id text, -- FK to members or companies (optional for visitors)
  booker_name text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'no-show', 'converted_to_visit')),
  branch_id text NOT NULL, -- FK to branches
  services jsonb DEFAULT '[]'::jsonb, -- Array of {serviceId, serviceName, price, quantity}
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 9. VISITS TABLE (Actual Check-ins/Check-outs)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.visits (
  id text PRIMARY KEY,
  date date NOT NULL, -- YYYY-MM-DD
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  visitor_type text NOT NULL CHECK (visitor_type IN ('member', 'company', 'visitor')),
  visitor_id text, -- FK to members or companies (optional for visitors)
  visitor_name text NOT NULL,
  booking_id text, -- Optional FK to bookings (if converted from booking)
  services jsonb DEFAULT '[]'::jsonb, -- Array of {serviceId, name, price, quantity, paymentStatus}
  status text NOT NULL CHECK (status IN ('checked-in', 'checked-out', 'outstanding', 'voided')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  branch_id text NOT NULL, -- FK to branches
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 10. EXPENSES TABLE (Expense Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id text PRIMARY KEY,
  date date NOT NULL, -- YYYY-MM-DD
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL, -- e.g., "Office Supplies", "Utilities", "Maintenance", "Food & Beverages", "Other"
  branch_id text, -- Optional - if NULL, expense is shared across branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 11. TRANSACTIONS TABLE (Financial Transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id text PRIMARY KEY,
  date date NOT NULL, -- YYYY-MM-DD
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text,
  payment_method text CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
  reference text, -- Optional reference number
  check_in_id text, -- Optional FK to visits (legacy)
  booking_id text, -- Optional FK to bookings
  expense_id text, -- Optional FK to expenses
  branch_id text, -- Optional - if NULL, transaction is shared across branches
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 12. TRANSACTION ITEMS TABLE (Transaction Line Items)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id text PRIMARY KEY,
  transaction_id text, -- Optional FK to transactions
  booking_id text, -- Optional FK to bookings
  expense_id text, -- Optional FK to expenses
  type text NOT NULL CHECK (type IN ('room', 'inventory', 'service')),
  item_id text NOT NULL, -- FK to services, inventory_items, or rooms
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  branch_id text NOT NULL, -- FK to branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- 13. INVOICES TABLE (Invoice Records)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id text PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  date date NOT NULL, -- YYYY-MM-DD
  due_date date, -- Optional due date
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  items jsonb DEFAULT '[]'::jsonb, -- Array of {description, quantity, unitPrice, total}
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0, -- Percentage
  discount numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_method text CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'other')),
  paid_date date, -- When invoice was paid
  notes text,
  branch_id text, -- Optional - if NULL, invoice is shared across branches
  transaction_id text, -- Optional FK to transactions
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 14. CONTRACTS TABLE (Member/Company Contracts)
-- =====================================================
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

-- =====================================================
-- 15. ROOM RESERVATIONS TABLE (Room Booking Records)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.room_reservations (
  id text PRIMARY KEY,
  room_id text NOT NULL, -- FK to rooms
  member_id text, -- Optional FK to members
  company_id text, -- Optional FK to companies
  visitor_name text NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  date date NOT NULL, -- YYYY-MM-DD
  branch_id text NOT NULL, -- FK to branches
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'checked-in')),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- 16. VOIDED TRANSACTIONS TABLE (Voided Transaction Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.voided_transactions (
  id text PRIMARY KEY,
  check_in_id text, -- Optional FK to visits
  transaction_id text, -- Optional FK to transactions
  voided_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  reason text,
  original_total_amount numeric DEFAULT 0,
  branch_id text NOT NULL, -- FK to branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- 17. OUTSTANDING TRANSACTIONS TABLE (Outstanding Payment Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.outstanding_transactions (
  id text PRIMARY KEY,
  check_in_id text, -- Optional FK to visits
  member_id text, -- Optional FK to members
  company_id text, -- Optional FK to companies
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  due_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding', 'partially-paid', 'paid')),
  branch_id text NOT NULL, -- FK to branches
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Enable RLS on all tables and create permissive policies for public access
-- In production, you should implement proper authentication-based policies

-- Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for users" ON "public"."users";
CREATE POLICY "Enable all access for users" ON "public"."users"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for branches" ON "public"."branches";
CREATE POLICY "Enable all access for branches" ON "public"."branches"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for members" ON "public"."members";
CREATE POLICY "Enable all access for members" ON "public"."members"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for companies" ON "public"."companies";
CREATE POLICY "Enable all access for companies" ON "public"."companies"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for rooms" ON "public"."rooms";
CREATE POLICY "Enable all access for rooms" ON "public"."rooms"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Inventory Items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for inventory_items" ON "public"."inventory_items";
CREATE POLICY "Enable all access for inventory_items" ON "public"."inventory_items"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for services" ON "public"."services";
CREATE POLICY "Enable all access for services" ON "public"."services"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for bookings" ON "public"."bookings";
CREATE POLICY "Enable all access for bookings" ON "public"."bookings"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for visits" ON "public"."visits";
CREATE POLICY "Enable all access for visits" ON "public"."visits"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for expenses" ON "public"."expenses";
CREATE POLICY "Enable all access for expenses" ON "public"."expenses"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for transactions" ON "public"."transactions";
CREATE POLICY "Enable all access for transactions" ON "public"."transactions"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Transaction Items
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for transaction_items" ON "public"."transaction_items";
CREATE POLICY "Enable all access for transaction_items" ON "public"."transaction_items"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for invoices" ON "public"."invoices";
CREATE POLICY "Enable all access for invoices" ON "public"."invoices"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for contracts" ON "public"."contracts";
CREATE POLICY "Enable all access for contracts" ON "public"."contracts"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Room Reservations
ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for room_reservations" ON "public"."room_reservations";
CREATE POLICY "Enable all access for room_reservations" ON "public"."room_reservations"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Voided Transactions
ALTER TABLE public.voided_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for voided_transactions" ON "public"."voided_transactions";
CREATE POLICY "Enable all access for voided_transactions" ON "public"."voided_transactions"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- Outstanding Transactions
ALTER TABLE public.outstanding_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for outstanding_transactions" ON "public"."outstanding_transactions";
CREATE POLICY "Enable all access for outstanding_transactions" ON "public"."outstanding_transactions"
  AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);

-- =====================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- =====================================================

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_company_id ON public.members(company_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON public.rooms(branch_id);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_branch_id ON public.services(branch_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON public.services(type);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id ON public.bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booker_id ON public.bookings(booker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Visits indexes
CREATE INDEX IF NOT EXISTS idx_visits_date ON public.visits(date);
CREATE INDEX IF NOT EXISTS idx_visits_branch_id ON public.visits(branch_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON public.visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_payment_status ON public.visits(payment_status);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON public.transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Transaction Items indexes
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_branch_id ON public.transaction_items(branch_id);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_member_id ON public.contracts(member_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_branch_id ON public.contracts(branch_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id ON public.invoices(branch_id);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses(branch_id);

-- Outstanding Transactions indexes
CREATE INDEX IF NOT EXISTS idx_outstanding_transactions_check_in_id ON public.outstanding_transactions(check_in_id);
CREATE INDEX IF NOT EXISTS idx_outstanding_transactions_status ON public.outstanding_transactions(status);

-- =====================================================
-- RELOAD SCHEMA CACHE (Supabase specific)
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================
-- This schema includes:
-- - All 17 tables required by the application
-- - Proper data types and constraints
-- - Row Level Security (RLS) enabled with permissive policies
-- - Indexes for common query patterns
-- - Timestamps (created_at, updated_at) for audit trails
--
-- Note: In production, you should:
-- 1. Implement proper authentication-based RLS policies
-- 2. Add foreign key constraints if needed
-- 3. Consider using UUIDs instead of text for IDs
-- 4. Add more indexes based on query patterns
-- 5. Implement proper password hashing for users table
-- =====================================================

