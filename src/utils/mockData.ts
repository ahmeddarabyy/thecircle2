// Mock data for the app - no database needed
import { Member, Company, Service, CheckIn, Room, Branch, InventoryItem, Expense, Transaction, Invoice, Contract, User, Booking, RoomReservation, TransactionItem } from '../types'


// Users
export const mockUsers: User[] = [
    { id: 'u1', username: 'admin', password: 'password', role: 'admin', fullName: 'Admin User' },
    { id: 'u-ahmed', username: 'ahmed@circleworkspace.com', password: 'password', role: 'admin', fullName: 'Ahmed' },
    { id: 'u-areeg', username: 'areeg@circleworkspace.com', password: 'password', role: 'front-desk', fullName: 'Areeg' },
    { id: 'u-yumna', username: 'yumna@circleworkspace.com', password: 'password', role: 'front-desk', fullName: 'Yumna' }
]

// Branches
export const mockBranches: Branch[] = [
    { id: 'branch-1', name: 'Main Branch', address: '123 Main St', phoneNumber: '+20123456789', email: 'main@circle.com', isActive: true }
]

// Members
export const mockMembers: Member[] = []

// Companies
export const mockCompanies: Company[] = []

// Services
export const mockServices: Service[] = [
    { id: 'service-1', name: 'Day Pass', price: 100, availableForMembers: true, availableForCompanies: false, type: 'one-time', branchId: 'branch-1' },
    { id: 'service-2', name: 'Meeting Room (Hourly)', price: 150, availableForMembers: true, availableForCompanies: true, type: 'one-time', branchId: 'branch-1' }
]

// Rooms
export const mockRooms: Room[] = [
    { id: 'room-1', name: 'Meeting Room A', capacity: 6, branchId: 'branch-1' },
    { id: 'room-2', name: 'Meeting Room B', capacity: 10, branchId: 'branch-1' }
]

// Inventory
export const mockInventory: InventoryItem[] = [
    { id: 'inv-1', name: 'Water Bottle', currentStock: 50, unit: 'bottle', lowStockThreshold: 10, branchId: 'branch-1' },
    { id: 'inv-2', name: 'Coffee', currentStock: 30, unit: 'cup', lowStockThreshold: 5, branchId: 'branch-1' }
]

// Check-ins
export const mockCheckIns: CheckIn[] = []

// Bookings
export const mockBookings: Booking[] = []

// Expenses
export const mockExpenses: Expense[] = []

// Transactions
export const mockTransactions: Transaction[] = []

// Invoices
export const mockInvoices: Invoice[] = []

// Contracts
export const mockContracts: Contract[] = []

// Room Reservations
export const mockRoomReservations: RoomReservation[] = []

// Transaction Items
export const mockTransactionItems: TransactionItem[] = []


// Simple in-memory storage
let currentUser: User | null = null

export const mockStorage = {
    // Users
    loadUsers: async () => mockUsers,
    loadCurrentUser: () => currentUser,
    saveCurrentUser: (user: User | null) => { currentUser = user },

    // Branches
    loadBranches: async () => mockBranches,

    // Members
    loadMembers: async () => mockMembers,
    createMember: async (member: Member) => { mockMembers.push(member) },
    updateMember: async (member: Member) => {
        const index = mockMembers.findIndex(m => m.id === member.id)
        if (index >= 0) mockMembers[index] = member
    },
    deleteMember: async (id: string) => {
        const index = mockMembers.findIndex(m => m.id === id)
        if (index >= 0) mockMembers.splice(index, 1)
    },

    // Companies
    loadCompanies: async () => mockCompanies,
    createCompany: async (company: Company) => { mockCompanies.push(company) },
    updateCompany: async (company: Company) => {
        const index = mockCompanies.findIndex(c => c.id === company.id)
        if (index >= 0) mockCompanies[index] = company
    },

    // Services
    loadServices: async () => mockServices,
    createService: async (service: Service) => { mockServices.push(service) },
    updateService: async (service: Service) => {
        const index = mockServices.findIndex(s => s.id === service.id)
        if (index >= 0) mockServices[index] = service
    },

    // Rooms
    loadRooms: async () => mockRooms,

    // Inventory
    loadInventory: async () => mockInventory,

    // Check-ins
    loadCheckIns: async () => mockCheckIns,
    createCheckIn: async (checkIn: CheckIn) => { mockCheckIns.push(checkIn) },
    updateCheckIn: async (checkIn: CheckIn) => {
        const index = mockCheckIns.findIndex(c => c.id === checkIn.id)
        if (index >= 0) mockCheckIns[index] = checkIn
    },

    // Bookings
    loadBookings: async () => mockBookings,
    createBooking: async (booking: Booking) => { mockBookings.push(booking) },
    updateBooking: async (booking: Booking) => {
        const index = mockBookings.findIndex(b => b.id === booking.id)
        if (index >= 0) mockBookings[index] = booking
    },

    // Expenses
    loadExpenses: async () => mockExpenses,
    createExpense: async (expense: Expense) => { mockExpenses.push(expense) },

    // Transactions
    loadTransactions: async () => mockTransactions,
    createTransaction: async (transaction: Transaction) => { mockTransactions.push(transaction) },

    // Invoices
    loadInvoices: async () => mockInvoices,
    createInvoice: async (invoice: Invoice) => { mockInvoices.push(invoice) },
    updateInvoice: async (invoice: Invoice) => {
        const index = mockInvoices.findIndex(i => i.id === invoice.id)
        if (index >= 0) mockInvoices[index] = invoice
    },

    // Contracts
    loadContracts: async () => mockContracts,
    createContract: async (contract: Contract) => { mockContracts.push(contract) },

    // Room Reservations
    loadRoomReservations: async () => mockRoomReservations,
    createRoomReservation: async (reservation: RoomReservation) => { mockRoomReservations.push(reservation) },

    // Transaction Items
    loadTransactionItems: async () => mockTransactionItems,
    createTransactionItem: async (item: TransactionItem) => { mockTransactionItems.push(item) },

    // Branch selection
    getSelectedBranch: () => localStorage.getItem('selected-branch') || 'branch-1',
    setSelectedBranch: (id: string) => localStorage.setItem('selected-branch', id)
}

