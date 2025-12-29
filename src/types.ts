export interface Member {
  id: string;
  fullName: string;
  occupation: string;
  phoneNumber: string;
  email: string;
  referralSource: string;
  companyId?: string; // Optional - member can belong to a company
  hasActiveContract: boolean; // Member contract for private desk
}

export interface Company {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhoneNumber: string;
  pointOfContact: string;
  employeeIds: string[]; // Array of member IDs who belong to this company
  hasActiveContract: boolean; // Company contract for private room monthly
}

export interface Service {
  id: string;
  name: string;
  price: number; // Price in EGP
  availableForMembers: boolean;
  availableForCompanies: boolean;
  type: 'one-time' | 'contract';
  branchId?: string; // Optional - if undefined, service is available at all branches
  inventoryItemId?: string; // Optional - links service to inventory item (e.g., WATER -> water bottles)
  inventoryQuantityPerSale?: number; // How many inventory items are consumed per service sale (default: 1)
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  branchId: string; // Which branch this room belongs to
}

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string; // e.g., "bottle", "pack", "bag", "roll"
  lowStockThreshold?: number; // Alert when stock is below this
  branchId?: string; // Optional - if undefined, item is shared across all branches
  createdAt?: string
  roomId?: string
  roomBookingStartTime?: string
  roomBookingEndTime?: string
  bookingDateTime?: string
  checkedOutDateTime?: string
  voidReason?: string;
  updatedAt?: string;
}

export interface InventoryHistory {
  id: string;
  inventoryItemId: string;
  changeType: 'add' | 'reduce' | 'update' | 'create' | 'delete';
  previousStock: number;
  newStock: number;
  quantityChanged: number; // Positive for add, negative for reduce
  changedByUserId?: string;
  changedByUserName?: string;
  reason?: string;
  notes?: string;
  branchId?: string;
  createdAt: string;
}

// New Booking interface (Advance Intent)
export interface Booking {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // "10:00 AM"
  endTime: string // "02:00 PM"
  resourceType: 'desk' | 'room'
  resourceId?: string
  bookerType: 'member' | 'company' | 'visitor'
  bookerId?: string
  bookerName: string
  status: 'confirmed' | 'cancelled' | 'no-show' | 'converted_to_visit'
  branchId: string
  services: {
    serviceId: string
    serviceName: string
    price: number
    quantity: number
  }[]
  notes?: string
  createdAt?: string
  roomId?: string
  roomBookingStartTime?: string
  roomBookingEndTime?: string
  bookingDateTime?: string
  checkedOutDateTime?: string
  voidReason?: string
  updatedAt?: string

  // Legacy fields to be phased out or mapped
  visitorName?: string
  expectedStartTime?: string
  expectedEndTime?: string
}

// Visit interface (Replaces CheckIn for Presence/Transactions)
export interface Visit {
  id: string
  date: string // YYYY-MM-DD
  checkInTime: string // ISO timestamp
  checkOutTime?: string // ISO timestamp
  visitorType: 'member' | 'company' | 'visitor'
  visitorId?: string
  visitorName: string
  bookingId?: string // Link to original booking
  services: {
    serviceId: string
    name: string
    price: number
    quantity: number
    paymentStatus: 'paid' | 'unpaid'
  }[]
  status: 'checked-in' | 'checked-out' | 'outstanding' | 'voided'
  paymentStatus: 'paid' | 'partial' | 'unpaid'
  totalAmount: number
  paidAmount: number
  inventoryItems?: {
    itemId: string
    itemName: string
    quantity: number
  }[]
  branchId: string
  notes?: string
  createdAt?: string
  roomId?: string
  roomBookingStartTime?: string
  roomBookingEndTime?: string
  bookingDateTime?: string
  checkedOutDateTime?: string
  voidReason?: string
  updatedAt?: string

  // Legacy compat
  memberName?: string
  dateTime?: string
  totalAmountLegacy?: number
}

// Alias CheckIn to Visit for backward compat during refactor
export type CheckIn = Visit


export interface Expense {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  description: string;
  amount: number; // Amount in EGP
  category: string; // e.g., "Office Supplies", "Utilities", "Maintenance", "Food & Beverages", "Other"
  branchId?: string; // Optional - if undefined, expense is shared across all branches
  createdAt: string; // When the expense was recorded (ISO date string)
}

export interface Transaction {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  type: 'income' | 'expense';
  description: string;
  amount: number; // Amount in EGP
  category: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  reference?: string; // Optional reference number
  checkInId?: string; // Optional link to check-in (LEGACY)
  bookingId?: string; // Link to the new Booking model
  expenseId?: string; // Optional link to expense if transaction is from an expense
  contractId?: string; // Optional link to contract for contract payments
  contractId?: string; // Optional link to contract for contract payments
  branchId?: string; // Optional - if undefined, transaction is shared across all branches
  createdAt: string; // When the transaction was recorded (ISO date string)
  notes?: string; // Optional notes
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Unique invoice number
  date: string; // Invoice date (ISO date string)
  dueDate?: string; // Optional due date (ISO date string)
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax?: number; // Optional tax amount
  taxRate?: number; // Optional tax rate percentage
  discount?: number; // Optional discount amount
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
  paidDate?: string; // When invoice was paid (ISO date string)
  notes?: string; // Optional notes
  branchId?: string; // Optional - if undefined, invoice is shared across all branches
  transactionId?: string; // Optional link to transaction if invoice was paid
  createdAt: string; // When the invoice was created (ISO date string)
}

export interface Contract {
  id: string;
  type: 'private-room-monthly' | 'private-desk'; // Contract type
  companyId?: string; // For private room monthly contracts
  memberId?: string; // For private desk contracts
  startDate: string; // Contract start date (ISO date string YYYY-MM-DD)
  endDate: string; // End date (ISO date string YYYY-MM-DD) - REQUIRED for parent contracts
  monthlyFee: number; // Monthly fee in EGP (fixed amount for MRR calculation)
  status: 'active' | 'expired' | 'cancelled';
  roomId?: string; // For private room contracts - which room
  autoRenew: boolean; // Whether contract auto-renews after end date
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  notes?: string; // Optional notes
  branchId: string; // Which branch this contract belongs to
  createdAt: string; // When the contract was created (ISO date string)
  cancelledDate?: string; // When contract was cancelled (ISO date string)
  pdfFileName?: string; // Name of uploaded PDF file
  pdfData?: string; // Base64 encoded PDF data
}

export interface ContractPeriod {
  id: string;
  contractId: string; // FK to parent contract
  periodMonth: number; // Month number (1-12)
  periodYear: number; // Year (e.g., 2025)
  periodName: string; // e.g., "January 2025"
  amount: number; // Monthly fee amount (from parent contract)
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  invoiceSent: boolean;
  paidDate?: string; // Date when payment was received (YYYY-MM-DD)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ContractRenewal {
  id: string;
  contractId: string; // FK to contracts
  renewalDate: string; // Date of this renewal (YYYY-MM-DD)
  renewalMonth: number; // Month number (1-12)
  renewalYear: number; // Year (e.g., 2025)
  amount: number; // Monthly fee amount
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  transactionId?: string; // Optional FK to transactions (for revenue tracking)
  status: 'paid' | 'pending' | 'failed';
  branchId: string; // FK to branches
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = 'admin' | 'operations' | 'front-desk';

export interface User {
  id: string;
  username: string;
  password: string; // Simple storage for demo purposes
  role: UserRole;
  fullName: string;
}

export interface RoomReservation {
  id: string;
  roomId: string;
  memberId?: string;
  companyId?: string;
  visitorName: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  date: string; // YYYY-MM-DD
  branchId: string;
  status: 'confirmed' | 'cancelled' | 'checked-in';
  notes?: string;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  checkInId?: string;
  bookingId?: string;
  expenseId?: string;
  type: 'room' | 'inventory' | 'service';
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  branchId: string;
  createdAt: string;
}

export interface VoidedTransaction {
  id: string;
  checkInId?: string;
  transactionId?: string;
  voidedAt: string; // ISO date string
  reason?: string;
  originalTotalAmount?: number;
  branchId: string;
}

export interface OutstandingTransaction {
  id: string;
  checkInId?: string;
  memberId?: string;
  companyId?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'outstanding' | 'partially-paid' | 'paid';
  branchId: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Notification {
  id: string;
  type: 'contract_payment_due' | 'contract_payment_overdue' | 'contract_expiring' | 'revenue_alert' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: {
    contractId?: string;
    contractPeriodId?: string;
    amount?: number;
    dueDate?: string;
    daysOverdue?: number;
    [key: string]: any;
  };
}
