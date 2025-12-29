# Contract Auto-Renewal System Guide

## Overview
The contract auto-renewal system automatically tracks monthly contract renewals and records them as separate revenue transactions for accurate financial tracking.

## Setup

### 1. Run Database Schema
Run the `contract_renewals_schema.sql` file in your Supabase SQL Editor. This will:
- Create the `contract_renewals` table
- Add `contract_id` field to `transactions` table
- Create helper functions for checking renewal status

### 2. How It Works

#### Contract Auto-Renewal Logic
- Contracts with `autoRenew: true` and `status: 'active'` are eligible for auto-renewal
- Each month, the system checks which contracts need renewal
- A renewal record is created for each contract that needs renewal
- A corresponding transaction record is created for revenue tracking
- Each renewal is recorded separately, allowing accurate monthly revenue tracking

#### Renewal Processing
1. Navigate to the **Renewals** tab in the app
2. Select the month and year you want to process renewals for
3. Click **"Process Renewals"**
4. The system will:
   - Find all active contracts with auto-renew enabled
   - Check if renewal already exists for that month/year
   - Create renewal records for contracts that need renewal
   - Create transaction records for revenue tracking
   - Link renewals to transactions

## Features

### Monthly Revenue Tracking
- Each renewal is recorded as a separate transaction
- Transactions are categorized as "Contract Renewal"
- Revenue is tracked by month, allowing accurate financial reporting

### Renewal Records
- Each renewal includes:
  - Contract ID
  - Renewal date (first day of the month)
  - Renewal month and year
  - Amount (monthly fee)
  - Payment method
  - Status (paid/pending/failed)
  - Linked transaction ID

### Viewing Renewals
- Navigate to the **Renewals** tab
- View renewals by month/year
- Filter by branch
- See total renewals and revenue for selected period

## Best Practices

### Monthly Processing
1. **Process renewals at the beginning of each month** for the current month
2. This ensures all active contracts are renewed and revenue is recorded
3. You can also process renewals for past months if needed

### Contract Management
- When creating a contract, ensure `autoRenew` is set to `true` for automatic renewals
- Contracts with `autoRenew: false` will not be processed
- Cancelled contracts (`status: 'cancelled'`) are automatically excluded

### Revenue Tracking
- All renewals create corresponding transactions
- Transactions appear in the **Transactions** tab
- Revenue from renewals is included in analytics and reports

## Database Schema

### contract_renewals Table
- `id`: Unique identifier
- `contract_id`: Foreign key to contracts
- `renewal_date`: Date of renewal (YYYY-MM-DD)
- `renewal_month`: Month number (1-12)
- `renewal_year`: Year
- `amount`: Monthly fee amount
- `payment_method`: Payment method used
- `transaction_id`: Linked transaction for revenue tracking
- `status`: paid/pending/failed
- `branch_id`: Branch where contract belongs
- Unique constraint: One renewal per contract per month/year

### transactions Table (Updated)
- Added `contract_id` field to link transactions to contract renewals
- Transactions with `contract_id` are renewal revenue

## API Functions

### `loadContractRenewals(contractId?: string)`
Loads all contract renewals, optionally filtered by contract ID.

### `createContractRenewal(renewal: ContractRenewal)`
Creates a new renewal record.

### `processContractRenewals(month: number, year: number, contracts: Contract[])`
Processes renewals for a given month/year:
- Filters contracts that need renewal
- Checks for existing renewals
- Creates renewal records
- Creates transaction records
- Returns summary of renewals and transactions created

## Troubleshooting

### Renewals Not Processing
- Check that contracts have `autoRenew: true`
- Check that contracts have `status: 'active'`
- Verify contract start date is before renewal month
- Check if renewal already exists for that month/year

### Missing Transactions
- Renewals automatically create transactions
- Check transaction category is "Contract Renewal"
- Verify `contract_id` is set in transaction record

### Duplicate Renewals
- System prevents duplicate renewals (unique constraint)
- If duplicate error occurs, check existing renewals for that month/year


