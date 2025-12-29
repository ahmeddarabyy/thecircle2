# Database Schema Reference

Quick reference mapping between TypeScript types and database tables.

## Type to Table Mapping

### Users
**TypeScript**: `User`  
**Table**: `users`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `username` | `username` | text (UNIQUE) |
| `password` | `password` | text |
| `role` | `role` | text (CHECK) |
| `fullName` | `full_name` | text |

### Branches
**TypeScript**: `Branch`  
**Table**: `branches`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `name` | `name` | text |
| `address` | `address` | text |
| `phoneNumber` | `phone_number` | text |
| `email` | `email` | text |
| `isActive` | `is_active` | boolean |

### Members
**TypeScript**: `Member`  
**Table**: `members`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `fullName` | `full_name` | text |
| `occupation` | `occupation` | text |
| `phoneNumber` | `phone_number` | text |
| `email` | `email` | text |
| `referralSource` | `referral_source` | text |
| `companyId` | `company_id` | text (FK) |
| `hasActiveContract` | `has_active_contract` | boolean |

### Companies
**TypeScript**: `Company`  
**Table**: `companies`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `companyName` | `name` | text |
| `companyEmail` | `contact_email` | text |
| `companyPhoneNumber` | `phone` | text |
| `pointOfContact` | `point_of_contact` | text |
| `employeeIds` | `employee_ids` | jsonb (array) |
| `hasActiveContract` | `has_active_contract` | boolean |

### Services
**TypeScript**: `Service`  
**Table**: `services`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `name` | `name` | text |
| `price` | `price` | numeric |
| `availableForMembers` | `available_for_members` | boolean |
| `availableForCompanies` | `available_for_companies` | boolean |
| `type` | `type` | text (CHECK) |
| `branchId` | `branch_id` | text (FK, optional) |
| `inventoryItemId` | `inventory_item_id` | text (FK, optional) |
| `inventoryQuantityPerSale` | `inventory_quantity_per_sale` | numeric |

### Rooms
**TypeScript**: `Room`  
**Table**: `rooms`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `name` | `name` | text |
| `capacity` | `capacity` | integer |
| `branchId` | `branch_id` | text (FK) |

### Inventory Items
**TypeScript**: `InventoryItem`  
**Table**: `inventory_items`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `name` | `name` | text |
| `currentStock` | `current_stock` | numeric |
| `unit` | `unit` | text |
| `lowStockThreshold` | `low_stock_threshold` | numeric |
| `branchId` | `branch_id` | text (FK, optional) |

### Bookings
**TypeScript**: `Booking`  
**Table**: `bookings`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `date` | `date` | date |
| `startTime` | `start_time` | text |
| `endTime` | `end_time` | text |
| `resourceType` | `resource_type` | text (CHECK) |
| `resourceId` | `resource_id` | text (FK, optional) |
| `bookerType` | `booker_type` | text (CHECK) |
| `bookerId` | `booker_id` | text (FK, optional) |
| `bookerName` | `booker_name` | text |
| `status` | `status` | text (CHECK) |
| `branchId` | `branch_id` | text (FK) |
| `services` | `services` | jsonb (array) |
| `notes` | `notes` | text |
| `createdAt` | `created_at` | timestamp |
| `updatedAt` | `updated_at` | timestamp |

### Visits (Check-ins)
**TypeScript**: `Visit` / `CheckIn`  
**Table**: `visits`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `date` | `date` | date |
| `checkInTime` | `check_in_time` | timestamp |
| `checkOutTime` | `check_out_time` | timestamp |
| `visitorType` | `visitor_type` | text (CHECK) |
| `visitorId` | `visitor_id` | text (FK, optional) |
| `visitorName` | `visitor_name` | text |
| `bookingId` | `booking_id` | text (FK, optional) |
| `services` | `services` | jsonb (array) |
| `status` | `status` | text (CHECK) |
| `paymentStatus` | `payment_status` | text (CHECK) |
| `totalAmount` | `total_amount` | numeric |
| `paidAmount` | `paid_amount` | numeric |
| `branchId` | `branch_id` | text (FK) |
| `notes` | `notes` | text |
| `createdAt` | `created_at` | timestamp |
| `updatedAt` | `updated_at` | timestamp |

### Expenses
**TypeScript**: `Expense`  
**Table**: `expenses`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `date` | `date` | date |
| `description` | `description` | text |
| `amount` | `amount` | numeric |
| `category` | `category` | text |
| `branchId` | `branch_id` | text (FK, optional) |
| `createdAt` | `created_at` | timestamp |

### Transactions
**TypeScript**: `Transaction`  
**Table**: `transactions`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `date` | `date` | date |
| `type` | `type` | text (CHECK) |
| `description` | `description` | text |
| `amount` | `amount` | numeric |
| `category` | `category` | text |
| `paymentMethod` | `payment_method` | text (CHECK) |
| `reference` | `reference` | text |
| `checkInId` | `check_in_id` | text (FK, optional) |
| `bookingId` | `booking_id` | text (FK, optional) |
| `expenseId` | `expense_id` | text (FK, optional) |
| `branchId` | `branch_id` | text (FK, optional) |
| `notes` | `notes` | text |
| `createdAt` | `created_at` | timestamp |

### Transaction Items
**TypeScript**: `TransactionItem`  
**Table**: `transaction_items`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `transactionId` | `transaction_id` | text (FK, optional) |
| `bookingId` | `booking_id` | text (FK, optional) |
| `expenseId` | `expense_id` | text (FK, optional) |
| `type` | `type` | text (CHECK) |
| `itemId` | `item_id` | text |
| `quantity` | `quantity` | numeric |
| `unitPrice` | `unit_price` | numeric |
| `totalPrice` | `total_price` | numeric |
| `branchId` | `branch_id` | text (FK) |
| `createdAt` | `created_at` | timestamp |

### Invoices
**TypeScript**: `Invoice`  
**Table**: `invoices`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `invoiceNumber` | `invoice_number` | text (UNIQUE) |
| `date` | `date` | date |
| `dueDate` | `due_date` | date |
| `customerName` | `customer_name` | text |
| `customerEmail` | `customer_email` | text |
| `customerPhone` | `customer_phone` | text |
| `customerAddress` | `customer_address` | text |
| `items` | `items` | jsonb (array) |
| `subtotal` | `subtotal` | numeric |
| `tax` | `tax` | numeric |
| `taxRate` | `tax_rate` | numeric |
| `discount` | `discount` | numeric |
| `total` | `total` | numeric |
| `status` | `status` | text (CHECK) |
| `paymentMethod` | `payment_method` | text (CHECK) |
| `paidDate` | `paid_date` | date |
| `notes` | `notes` | text |
| `branchId` | `branch_id` | text (FK, optional) |
| `transactionId` | `transaction_id` | text (FK, optional) |
| `createdAt` | `created_at` | timestamp |

### Contracts
**TypeScript**: `Contract`  
**Table**: `contracts`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `type` | `type` | text (CHECK) |
| `companyId` | `company_id` | text (FK, optional) |
| `memberId` | `member_id` | text (FK, optional) |
| `startDate` | `start_date` | date |
| `endDate` | `end_date` | date |
| `monthlyFee` | `monthly_fee` | numeric |
| `status` | `status` | text (CHECK) |
| `roomId` | `room_id` | text (FK, optional) |
| `autoRenew` | `auto_renew` | boolean |
| `paymentMethod` | `payment_method` | text (CHECK) |
| `notes` | `notes` | text |
| `branchId` | `branch_id` | text (FK) |
| `createdAt` | `created_at` | timestamp |
| `cancelledDate` | `cancelled_date` | date |
| `pdfFileName` | `pdf_file_name` | text |
| `pdfData` | `pdf_data` | text (base64) |

### Room Reservations
**TypeScript**: `RoomReservation`  
**Table**: `room_reservations`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `roomId` | `room_id` | text (FK) |
| `memberId` | `member_id` | text (FK, optional) |
| `companyId` | `company_id` | text (FK, optional) |
| `visitorName` | `visitor_name` | text |
| `startTime` | `start_time` | timestamp |
| `endTime` | `end_time` | timestamp |
| `date` | `date` | date |
| `branchId` | `branch_id` | text (FK) |
| `status` | `status` | text (CHECK) |
| `notes` | `notes` | text |

### Voided Transactions
**TypeScript**: `VoidedTransaction`  
**Table**: `voided_transactions`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `checkInId` | `check_in_id` | text (FK, optional) |
| `transactionId` | `transaction_id` | text (FK, optional) |
| `voidedAt` | `voided_at` | timestamp |
| `reason` | `reason` | text |
| `originalTotalAmount` | `original_total_amount` | numeric |
| `branchId` | `branch_id` | text (FK) |

### Outstanding Transactions
**TypeScript**: `OutstandingTransaction`  
**Table**: `outstanding_transactions`

| TypeScript Field | Database Column | Type |
|-----------------|-----------------|------|
| `id` | `id` | text (PK) |
| `checkInId` | `check_in_id` | text (FK, optional) |
| `memberId` | `member_id` | text (FK, optional) |
| `companyId` | `company_id` | text (FK, optional) |
| `totalAmount` | `total_amount` | numeric |
| `paidAmount` | `paid_amount` | numeric |
| `dueAmount` | `due_amount` | numeric |
| `status` | `status` | text (CHECK) |
| `branchId` | `branch_id` | text (FK) |
| `createdAt` | `created_at` | timestamp |
| `updatedAt` | `updated_at` | timestamp |

## JSONB Field Structures

### companies.employee_ids
```json
["member-id-1", "member-id-2", "member-id-3"]
```

### bookings.services
```json
[
  {
    "serviceId": "service-123",
    "serviceName": "Day Pass",
    "price": 100,
    "quantity": 2
  }
]
```

### visits.services
```json
[
  {
    "serviceId": "service-123",
    "name": "Day Pass",
    "price": 100,
    "quantity": 1,
    "paymentStatus": "paid"
  }
]
```

### invoices.items
```json
[
  {
    "description": "Day Pass",
    "quantity": 2,
    "unitPrice": 100,
    "total": 200
  }
]
```

## Check Constraints

### users.role
- `'admin'`
- `'front-desk'`

### services.type
- `'one-time'`
- `'contract'`

### bookings.resource_type
- `'desk'`
- `'room'`

### bookings.booker_type
- `'member'`
- `'company'`
- `'visitor'`

### bookings.status
- `'confirmed'`
- `'cancelled'`
- `'no-show'`
- `'converted_to_visit'`

### visits.visitor_type
- `'member'`
- `'company'`
- `'visitor'`

### visits.status
- `'checked-in'`
- `'checked-out'`
- `'outstanding'`
- `'voided'`

### visits.payment_status
- `'paid'`
- `'partial'`
- `'unpaid'`

### transactions.type
- `'income'`
- `'expense'`

### transactions.payment_method
- `'cash'`
- `'card'`
- `'bank_transfer'`
- `'other'`

### transaction_items.type
- `'room'`
- `'inventory'`
- `'service'`

### invoices.status
- `'draft'`
- `'sent'`
- `'paid'`
- `'overdue'`
- `'cancelled'`

### contracts.type
- `'private-room-monthly'`
- `'private-desk'`

### contracts.status
- `'active'`
- `'expired'`
- `'cancelled'`

### room_reservations.status
- `'confirmed'`
- `'cancelled'`
- `'checked-in'`

### outstanding_transactions.status
- `'outstanding'`
- `'partially-paid'`
- `'paid'`

