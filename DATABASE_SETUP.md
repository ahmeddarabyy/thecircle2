# Database Setup Guide

This guide will help you set up the database schema for the Coworking Space Management App.

## Overview

The application uses **Supabase** (PostgreSQL) as its database. The complete schema is defined in `database_schema.sql`.

## Database Tables

The schema includes 17 tables:

1. **users** - User authentication and roles
2. **branches** - Multiple coworking space locations
3. **members** - Individual members/customers
4. **companies** - Company records
5. **rooms** - Rooms at each branch
6. **inventory_items** - Inventory/product tracking
7. **services** - Available services (passes, F&B, etc.)
8. **bookings** - Advance reservations/bookings
9. **visits** - Actual check-ins and check-outs
10. **expenses** - Expense tracking
11. **transactions** - Financial transactions
12. **transaction_items** - Line items for transactions
13. **invoices** - Invoice records
14. **contracts** - Member/company contracts
15. **room_reservations** - Room booking records
16. **voided_transactions** - Voided transaction tracking
17. **outstanding_transactions** - Outstanding payment tracking

## Setup Instructions

### Prerequisites

- A Supabase account and project
- Access to the Supabase SQL Editor

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Schema Script

1. Open the `database_schema.sql` file
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press `Cmd/Ctrl + Enter`)

### Step 3: Verify Tables Were Created

1. Navigate to **Table Editor** in Supabase
2. You should see all 17 tables listed
3. Verify that Row Level Security (RLS) is enabled on each table

### Step 4: Configure Environment Variables

Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings under **API**.

## Schema Features

### Data Types

- **Text fields**: Used for IDs, names, descriptions
- **Numeric fields**: Used for prices, amounts, quantities
- **Date/Time fields**: Used for timestamps and dates
- **JSONB fields**: Used for arrays and complex objects (services, items)

### Constraints

- **Primary Keys**: All tables have `id` as primary key
- **Check Constraints**: Enums are enforced (e.g., status values, types)
- **Default Values**: Sensible defaults are set for common fields
- **NOT NULL**: Required fields are marked as NOT NULL

### Row Level Security (RLS)

All tables have RLS enabled with permissive policies for development. **Important**: In production, you should implement proper authentication-based policies.

### Indexes

Indexes are created on frequently queried fields:
- Foreign key columns
- Status fields
- Date fields
- Search fields (emails, names)

## Important Notes

1. **ID Format**: The schema uses `text` type for IDs. The application generates IDs like `member-1234567890` or `booking-1234567890`.

2. **JSONB Fields**: Several tables use JSONB for arrays:
   - `companies.employee_ids` - Array of member IDs
   - `bookings.services` - Array of service objects
   - `visits.services` - Array of service objects
   - `invoices.items` - Array of invoice line items

3. **Optional Foreign Keys**: Many relationships are stored as text IDs rather than formal foreign key constraints for flexibility.

4. **Timestamps**: Most tables include `created_at` and `updated_at` for audit trails.

## Testing the Schema

After running the schema, you can test it by:

1. Inserting sample data through the Supabase Table Editor
2. Using the application's UI to create records
3. Verifying data appears correctly in the app

## Troubleshooting

### "Missing Supabase environment variables" Error

- Check that `.env` file exists in the project root
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the development server after changing `.env`

### Tables Not Appearing

- Check the SQL Editor for any error messages
- Verify you're looking at the correct Supabase project
- Refresh the Table Editor page

### RLS Policies Blocking Access

- The schema includes permissive policies (`USING (true) WITH CHECK (true)`)
- If you still have issues, check Supabase logs in the Dashboard
- Verify RLS is enabled and policies exist

### Data Type Mismatches

- All numeric fields use `numeric` type (supports decimals)
- Date fields use `date` type for dates and `timestamp with time zone` for timestamps
- Text fields use `text` type (unlimited length)

## Next Steps

1. **Seed Data**: Consider creating seed data for testing (branches, services, etc.)
2. **Users**: Create initial admin users in the `users` table
3. **Branches**: Add your coworking space branches
4. **Services**: Configure your services and pricing
5. **Security**: Review and update RLS policies for production use

## Schema Diagram

```
users
  └── (authentication)

branches
  ├── rooms (branch_id)
  ├── services (branch_id)
  ├── members (via contracts)
  └── companies (via contracts)

members
  ├── company_id → companies
  └── contracts (member_id)

companies
  └── contracts (company_id)

bookings
  ├── branch_id → branches
  ├── booker_id → members/companies
  └── resource_id → rooms

visits
  ├── branch_id → branches
  ├── visitor_id → members/companies
  └── booking_id → bookings

transactions
  ├── branch_id → branches
  ├── check_in_id → visits
  ├── booking_id → bookings
  └── expense_id → expenses

transaction_items
  ├── transaction_id → transactions
  └── branch_id → branches

contracts
  ├── branch_id → branches
  ├── member_id → members
  ├── company_id → companies
  └── room_id → rooms
```

## Support

If you encounter any issues with the database setup, please check:
1. Supabase project logs
2. Browser console for frontend errors
3. Network tab for API request errors

