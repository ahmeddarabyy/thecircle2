# Contract Periods Migration Guide

## Overview
The contract system has been redesigned to use **contract periods** instead of payment status on contracts themselves.

## New Structure

### Parent Contract
- One contract per company/member
- Has: `startDate`, `endDate`, `monthlyFee` (fixed amount)
- **MRR** = Sum of all active contracts' `monthlyFee` (fixed, doesn't change)

### Contract Periods
- Each month within the contract period is a separate `contract_periods` record
- Each period has: `paymentStatus`, `invoiceSent`, `paidDate`
- **Total Sales** = Sum of all paid periods' `amount`

## Database Changes Required

1. **Run `contract_periods_schema.sql`** to create the `contract_periods` table
2. **Update `contracts` table** to make `end_date` NOT NULL (if not already)
3. **Remove** `parent_contract_id`, `payment_status`, `invoice_sent` columns from `contracts` table (optional, for cleanup)

## How It Works

### Creating a Contract
1. User creates contract with `startDate`, `endDate`, `monthlyFee`
2. System automatically generates `contract_periods` for each month in the period
3. Each period starts as `unpaid`

### Renewing a Contract
1. User clicks "Renew" button
2. System extends `endDate` by one month
3. System creates a new `contract_period` for that month

### Marking Payment
1. User expands contract to see periods
2. User clicks on period payment status badge
3. System updates that specific period's `paymentStatus`

## UI Changes Needed

1. **Contract Form**: Remove payment status/invoice fields, make endDate required
2. **Contracts Table**: 
   - Remove payment/invoice columns from contract row
   - Add expand/collapse button to show periods
   - Display periods in expandable section below contract
3. **Period Display**: Show each period with payment status badge (clickable)

## Next Steps

1. Run the SQL script: `contract_periods_schema.sql`
2. Update the code to remove all references to `contract.paymentStatus` and `contract.invoiceSent`
3. Update UI to display periods instead of contract-level payment status


