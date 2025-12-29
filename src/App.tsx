// Vercel Trigger: v4
import { useState, useEffect } from 'react'
import './App.css'
import {
  Users,
  Building2,
  Coffee,
  CalendarCheck,
  LayoutDashboard,
  Home,
  MapPin,
  Package,
  Receipt,
  ArrowRightLeft,
  FileText,
  ScrollText,
  BarChart3, Bell,
  FlaskConical,
  Building
} from 'lucide-react'

import MembersTab from './components/MembersTab'
import CompaniesTab from './components/CompaniesTab'
import ServicesTab from './components/ServicesTab'
import DailyOperationsTab from './components/DailyOperationsTab'
import DashboardTab from './components/DashboardTab'
import AvailablePropertiesTab from './components/AvailablePropertiesTab'
import BranchesTab from './components/BranchesTab'
import InventoryTab from './components/InventoryTab'
import EnhancedInventoryTab from './components/EnhancedInventoryTab'
import ExpensesTab from './components/ExpensesTab'
import TransactionsTab from './components/TransactionsTab'
import InvoicesTab from './components/InvoicesTab'
import ContractsTab from './components/ContractsTab'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import {
  Member, Company, Service, CheckIn, Room, Branch,
  InventoryItem, Expense, Transaction, Invoice, Contract,
  User, Booking, RoomReservation, TransactionItem,
  VoidedTransaction, OutstandingTransaction
} from './types'
import {
  loadUsers, loadCurrentUser, saveCurrentUser,
  loadBranches, getSelectedBranch, setSelectedBranch,
  loadMembers, createMember, updateMember, deleteMember,
  loadCompanies, createCompany, updateCompany,
  loadServices, createService, updateService,
  loadRooms,
  loadInventory,
  loadCheckIns, createCheckIn, updateCheckIn,
  loadBookings, createBooking, updateBooking, deleteBooking, convertBookingToVisit,
  loadExpenses, createExpense,
  loadTransactions, createTransaction,
  loadInvoices, createInvoice, updateInvoice,
  loadContracts, createContract,
  loadRoomReservations, createRoomReservation,
  loadTransactionItems, createTransactionItem,
  createVoidedTransaction, createOutstandingTransaction, updateOutstandingTransaction
} from './utils/storage'
import { supabase } from './lib/supabase'
import LoginScreen from './components/LoginScreen'
import { LogOut } from 'lucide-react'

type Tab = 'members' | 'companies' | 'services' | 'daily-operations' | 'dashboard' | 'properties' | 'branches' | 'inventory' | 'expenses' | 'transactions' | 'invoices' | 'contracts' | 'analytics'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('daily-operations')
  const [members, setMembers] = useState<Member[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [roomReservations, setRoomReservations] = useState<RoomReservation[]>([])
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([])
  const [autoCreateInvoiceFromTransactionId, setAutoCreateInvoiceFromTransactionId] = useState<string | null>(null)


  const [isInitialized, setIsInitialized] = useState(false)
  // Notifications system
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    refreshNotifications
  } = useNotifications(contracts, contractPeriods)

  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false)
  // Load user on mount
  useEffect(() => {
    // Initialize default users if needed
    loadUsers()

    const currentUser = loadCurrentUser()
    if (currentUser) {
      setUser(currentUser)
    }
  }, [])

  // Load data from Supabase on mount or when user changes
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        const [
          loadedBranches,
          loadedMembers,
          loadedCompanies,
          loadedServices,
          loadedCheckIns,
          loadedBookings,
          loadedRooms,
          loadedInventory,
          loadedExpenses,
          loadedTransactions,
          loadedInvoices,
          loadedContracts,
          loadedRoomReservations,
          loadedTransactionItems
        ] = await Promise.all([
          loadBranches(),
          loadMembers(),
          loadCompanies(),
          loadServices(),
          loadCheckIns(),
          loadBookings(),
          loadRooms(),
          loadInventory(),
          loadExpenses(),
          loadTransactions(),
          loadInvoices(),
          loadContracts(),
          loadRoomReservations(),
          loadTransactionItems()
        ])

        setBranches(loadedBranches)

        // Handle branch selection
        const savedBranchId = getSelectedBranch()
        if (savedBranchId && loadedBranches.find(b => b.id === savedBranchId && b.isActive)) {
          setSelectedBranchId(savedBranchId)
        } else if (loadedBranches.length > 0) {
          const firstActive = loadedBranches.find(b => b.isActive) || loadedBranches[0]
          if (firstActive) {
            setSelectedBranchId(firstActive.id)
            setSelectedBranch(firstActive.id)
          }
        }

        setMembers(loadedMembers)
        setCompanies(loadedCompanies)
        setServices(loadedServices)
        setCheckIns(loadedCheckIns)
        setBookings(loadedBookings)
        setRooms(loadedRooms)
        setInventory(loadedInventory)
        setExpenses(loadedExpenses)
        setTransactions(loadedTransactions)
        setInvoices(loadedInvoices)
        setContracts(loadedContracts)
        setRoomReservations(loadedRoomReservations)
        setTransactionItems(loadedTransactionItems)
        setIsInitialized(true)

      } catch (error) {
        console.error("Failed to load data:", error)
      }
    }

    fetchData()
  }, [user])

  // Early return for login - must be before any other logic
  if (!user) {
    return <LoginScreen onLogin={setUser} />
  }

  // Filter data by selected branch
  const filteredCheckIns = selectedBranchId
    ? checkIns.filter(ci => ci.branchId === selectedBranchId)
    : []

  const filteredRooms = selectedBranchId
    ? rooms.filter(r => r.branchId === selectedBranchId)
    : []

  const filteredServices = selectedBranchId
    ? services.filter(s => !s.branchId || s.branchId === selectedBranchId)
    : []

  const handleCheckIn = (checkIn: CheckIn) => {
    if (!selectedBranchId) {
      alert('Please select a branch first')
      return
    }
    const checkInWithBranch = { ...checkIn, branchId: selectedBranchId }

    // Update inventory if items were sold
    if (checkInWithBranch.inventoryItems && checkInWithBranch.inventoryItems.length > 0) {
      const updatedInventory = [...inventory]
      checkInWithBranch.inventoryItems.forEach(soldItem => {
        const inventoryItem = updatedInventory.find(inv => inv.id === soldItem.itemId)
        if (inventoryItem) {
          if (!inventoryItem.branchId || inventoryItem.branchId === selectedBranchId) {
            inventoryItem.currentStock = Math.max(0, inventoryItem.currentStock - soldItem.quantity)
          }
        }
      })
      setInventory(updatedInventory)
    }

    // Save to mock storage
    createCheckIn(checkInWithBranch)
    setCheckIns(prev => [...prev, checkInWithBranch])
    alert(`Member ${checkIn.memberName} checked in successfully!\nTotal: ${checkIn.totalAmount} EGP`)
  }

  const handleBooking = (booking: Booking) => {
    if (!selectedBranchId) {
      alert('Please select a branch first')
      return
    }
    const bookingWithBranch = { ...booking, branchId: selectedBranchId }

    // Save to proper bookings table
    createBooking(bookingWithBranch)
    setBookings(prev => [...prev, bookingWithBranch])
    alert(`Booking created successfully for ${booking.visitorName}!`)
  }

  // TEMPORARILY DISABLED - Old V2 code, will rebuild from scratch
  /*
  const processPayments = async (updatedCheckIn: CheckIn, existingCheckIn?: CheckIn) => {
    // ... complex payment processing code ...
  }

  const handleUpdateCheckIn = async (updatedCheckIn: CheckIn) => {
    // ... complex update logic ...
  }
  */

  // Handle creating a new visit (for split functionality)
  const handleCreateVisit = async (newVisit: CheckIn) => {
    await createCheckIn(newVisit)
    setCheckIns(prev => [...prev, newVisit])
  }

  // Handle check-in updates (State transitions from Kanban)
  const handleUpdateCheckIn = async (updatedCheckIn: CheckIn) => {
    // First, check if this is actually a Booking (before checking for existing visit)
    // This handles the case where a booking is being converted to checked-in
    const booking = bookings.find(b => b.id === updatedCheckIn.id)

    if (booking) {
      // Logic for Booking transitions
      if (updatedCheckIn.status === 'checked-in') {
        // Check if visit already exists (prevent duplicate conversion)
        const existingVisitFromBooking = checkIns.find(ci => ci.bookingId === booking.id && ci.status === 'checked-in')
        if (existingVisitFromBooking) {
          console.warn('Visit already exists for this booking, skipping conversion')
          return
        }
        
        const newVisit = await convertBookingToVisit(booking.id)
        if (newVisit) {
          setCheckIns(prev => [...prev, newVisit])
          // Update local booking to remove from "Bookings" column (status='converted_to_visit')
          setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'converted_to_visit' } : b))
          alert(`Booking for ${booking.visitorName || booking.bookerName} has been checked in!`)
        }
      } else if (updatedCheckIn.status === 'voided') {
        // Voiding a booking -> Cancel/No-show
        const updatedBooking = { ...booking, status: 'cancelled' as const, updatedAt: new Date().toISOString() }
        await updateBooking(updatedBooking)
        setBookings(prev => prev.map(b => b.id === booking.id ? updatedBooking : b))
      }
      return // Exit early - booking handling is complete
    }
    
    // Check if this is a new visit (for split functionality - has a new ID that doesn't exist)
    const existingCheckIn = checkIns.find(ci => ci.id === updatedCheckIn.id)
    if (!existingCheckIn) {
      // This is a new visit (from split functionality)
      await createCheckIn(updatedCheckIn)
      setCheckIns(prev => [...prev, updatedCheckIn])
      return
    }
    
    // Normal Visit (CheckIn) update logic
    const oldStatus = existingCheckIn?.status
    const newStatus = updatedCheckIn.status
    
    // Handle check-out time and date logic:
    // - If moving from checked-in → checked-out: Set check-out time (first time checking out)
    // - If moving from outstanding → checked-out: Preserve original check-out time AND date
    //   (This ensures revenue stays attributed to the original day, not the payment day)
    // - Validate payment is fully paid before allowing check-out
    if (updatedCheckIn.status === 'checked-out') {
      // Validate payment before allowing check-out
      const totalAmount = updatedCheckIn.totalAmount || 0
      const paidAmount = updatedCheckIn.paidAmount || 0
      const paymentStatus = updatedCheckIn.paymentStatus || 'unpaid'
      
      // Only allow check-out if fully paid
      if (paymentStatus !== 'paid' || paidAmount < totalAmount || totalAmount === 0) {
        const outstandingAmount = totalAmount - paidAmount
        alert(`⚠️ Cannot check out: Payment is not complete.\n\nTotal Amount: ${totalAmount.toLocaleString()} EGP\nPaid Amount: ${paidAmount.toLocaleString()} EGP\nOutstanding: ${outstandingAmount.toLocaleString()} EGP\n\nPlease ensure all services are fully paid before checking out.`)
        // Revert status change
        return
      }
      
      if (oldStatus === 'checked-in' && !updatedCheckIn.checkOutTime) {
        // First time checking out - set check-out time
        updatedCheckIn.checkOutTime = new Date().toISOString()
      } else if (oldStatus === 'outstanding') {
        // Moving back from outstanding - preserve original check-out time and date
        // This ensures accounting accuracy: revenue attributed to original service day
        if (existingCheckIn?.checkOutTime) {
          updatedCheckIn.checkOutTime = existingCheckIn.checkOutTime
        }
        // Preserve original date (for revenue attribution to correct day)
        if (existingCheckIn?.date) {
          updatedCheckIn.date = existingCheckIn.date
        }
        // ALWAYS preserve visitor information to prevent "unknown" member issue
        // If existingCheckIn doesn't have visitor info, reload from database
        if (existingCheckIn) {
          if (!existingCheckIn.visitorId || !existingCheckIn.visitorName) {
            // Reload visit from database to get complete visitor info
            const { data: dbVisit, error } = await supabase
              .from('visits')
              .select('visitor_id, visitor_name, visitor_type')
              .eq('id', updatedCheckIn.id)
              .single()
            
            if (!error && dbVisit) {
              updatedCheckIn.visitorId = dbVisit.visitor_id || existingCheckIn.visitorId
              updatedCheckIn.visitorName = dbVisit.visitor_name || existingCheckIn.visitorName
              updatedCheckIn.visitorType = (dbVisit.visitor_type as any) || existingCheckIn.visitorType
            } else {
              // Fallback to existingCheckIn values
              updatedCheckIn.visitorId = existingCheckIn.visitorId
              updatedCheckIn.visitorName = existingCheckIn.visitorName
              updatedCheckIn.visitorType = existingCheckIn.visitorType
            }
          } else {
            // existingCheckIn has visitor info, use it
            updatedCheckIn.visitorId = existingCheckIn.visitorId
            updatedCheckIn.visitorName = existingCheckIn.visitorName
            updatedCheckIn.visitorType = existingCheckIn.visitorType
          }
        }
      } else if (!updatedCheckIn.checkOutTime) {
        // Fallback: if no check-out time exists, set it now
        updatedCheckIn.checkOutTime = new Date().toISOString()
      }
      // If checkOutTime is already set and we're not coming from outstanding, keep it as-is
    }

    // Update the visit first
    await updateCheckIn(updatedCheckIn)
    // IMPORTANT: Use the updatedCheckIn object directly to ensure visitor info is preserved
    setCheckIns(prev => prev.map(ci => {
      if (ci.id === updatedCheckIn.id) {
        // Merge to ensure all fields are preserved, especially visitor info
        return {
          ...ci,
          ...updatedCheckIn,
          // Explicitly preserve visitor info
          visitorId: updatedCheckIn.visitorId || ci.visitorId,
          visitorName: updatedCheckIn.visitorName || ci.visitorName,
          visitorType: updatedCheckIn.visitorType || ci.visitorType
        }
      }
      return ci
    }))

    // Handle status transitions
    if (newStatus === 'voided' && oldStatus !== 'voided') {
      // Create voided transaction record
      // Get void reason from the updated check-in (passed from KanbanBoard)
      const voidReason = (updatedCheckIn as any).voidReason || 'Voided via kanban board'
      const voidedTransaction: VoidedTransaction = {
        id: `voided-${updatedCheckIn.id}-${Date.now()}`,
        checkInId: updatedCheckIn.id,
        voidedAt: new Date().toISOString(),
        originalTotalAmount: existingCheckIn?.totalAmount || updatedCheckIn.totalAmount || 0,
        branchId: updatedCheckIn.branchId,
        reason: voidReason
      }
      await createVoidedTransaction(voidedTransaction)

      // IMPORTANT: Create a REVERSAL transaction to maintain accurate financial records and audit trail
      // This shows users exactly what happened - the original transaction AND the reversal
      const existingTransaction = transactions.find(t => t.checkInId === updatedCheckIn.id)
      if (existingTransaction) {
        // Create a reversal transaction with NEGATIVE amount
        const reversalTransaction: Transaction = {
          id: `reversal-${existingTransaction.id}-${Date.now()}`,
          date: new Date().toISOString().split('T')[0], // Today's date for the reversal
          type: 'income', // Still income type, but negative amount
          description: `VOIDED: ${existingTransaction.description} - ${voidReason}`,
          amount: -Math.abs(existingTransaction.amount), // Negative amount to reverse
          category: 'Void Reversal',
          paymentMethod: existingTransaction.paymentMethod,
          checkInId: updatedCheckIn.id,
          branchId: existingTransaction.branchId,
          createdAt: new Date().toISOString()
        }
        
        // Save reversal transaction to database
        await createTransaction(reversalTransaction)
        setTransactions(prev => [...prev, reversalTransaction])
        console.log('Created reversal transaction for voided visit:', reversalTransaction.id)

        // Create reversal transaction items (negative quantities)
        const relatedItems = transactionItems.filter(ti => ti.transactionId === existingTransaction.id)
        for (const item of relatedItems) {
          const reversalItem: TransactionItem = {
            id: `reversal-${item.id}-${Date.now()}`,
            transactionId: reversalTransaction.id,
            type: item.type,
            itemId: item.itemId,
            quantity: -Math.abs(item.quantity), // Negative quantity
            unitPrice: item.unitPrice,
            totalPrice: -Math.abs(item.totalPrice), // Negative total
            branchId: item.branchId,
            createdAt: new Date().toISOString()
          }
          await createTransactionItem(reversalItem)
          setTransactionItems(prev => [...prev, reversalItem])
        }
      }
    }

    if (newStatus === 'outstanding' && oldStatus !== 'outstanding') {
      // Create or update outstanding transaction record
      // First, check if one already exists by querying the database
      const { data: existingOutstanding } = await supabase
        .from('outstanding_transactions')
        .select('*')
        .eq('check_in_id', updatedCheckIn.id)
        .maybeSingle()

      const dueAmount = (updatedCheckIn.totalAmount || 0) - (updatedCheckIn.paidAmount || 0)

      if (existingOutstanding) {
        // Update existing outstanding transaction
        const updatedOutstanding: OutstandingTransaction = {
          id: existingOutstanding.id,
          checkInId: updatedCheckIn.id,
          memberId: updatedCheckIn.visitorType === 'member' ? updatedCheckIn.visitorId : undefined,
          companyId: updatedCheckIn.visitorType === 'company' ? updatedCheckIn.visitorId : undefined,
          totalAmount: updatedCheckIn.totalAmount || 0,
          paidAmount: updatedCheckIn.paidAmount || 0,
          dueAmount: dueAmount,
          status: dueAmount > 0 ? (updatedCheckIn.paidAmount && updatedCheckIn.paidAmount > 0 ? 'partially-paid' : 'outstanding') : 'paid',
          branchId: updatedCheckIn.branchId,
          createdAt: (existingOutstanding as any).created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await updateOutstandingTransaction(updatedOutstanding)
      } else {
        // Create new outstanding transaction
        const outstandingTransaction: OutstandingTransaction = {
          id: `outstanding-${updatedCheckIn.id}-${Date.now()}`,
          checkInId: updatedCheckIn.id,
          memberId: updatedCheckIn.visitorType === 'member' ? updatedCheckIn.visitorId : undefined,
          companyId: updatedCheckIn.visitorType === 'company' ? updatedCheckIn.visitorId : undefined,
          totalAmount: updatedCheckIn.totalAmount || 0,
          paidAmount: updatedCheckIn.paidAmount || 0,
          dueAmount: dueAmount,
          status: dueAmount > 0 ? (updatedCheckIn.paidAmount && updatedCheckIn.paidAmount > 0 ? 'partially-paid' : 'outstanding') : 'paid',
          branchId: updatedCheckIn.branchId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await createOutstandingTransaction(outstandingTransaction)
      }
    } else if (oldStatus === 'outstanding' && newStatus !== 'outstanding') {
      // If moving away from outstanding status, update the outstanding transaction to paid
      const { data: existingOutstanding } = await supabase
        .from('outstanding_transactions')
        .select('*')
        .eq('check_in_id', updatedCheckIn.id)
        .maybeSingle()

      if (existingOutstanding) {
        const dueAmount = (updatedCheckIn.totalAmount || 0) - (updatedCheckIn.paidAmount || 0)
        const updatedOutstanding: OutstandingTransaction = {
          id: existingOutstanding.id,
          checkInId: updatedCheckIn.id,
          memberId: updatedCheckIn.visitorType === 'member' ? updatedCheckIn.visitorId : undefined,
          companyId: updatedCheckIn.visitorType === 'company' ? updatedCheckIn.visitorId : undefined,
          totalAmount: updatedCheckIn.totalAmount || 0,
          paidAmount: updatedCheckIn.paidAmount || 0,
          dueAmount: dueAmount,
          status: dueAmount <= 0 ? 'paid' : (updatedCheckIn.paidAmount && updatedCheckIn.paidAmount > 0 ? 'partially-paid' : 'outstanding'),
          branchId: updatedCheckIn.branchId,
          createdAt: (existingOutstanding as any).created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await updateOutstandingTransaction(updatedOutstanding)
      }

      // Create transaction items for the paid services when moving from outstanding to checked-out
      if (newStatus === 'checked-out' && updatedCheckIn.paymentStatus === 'paid' && updatedCheckIn.services) {
        // Check if a transaction already exists for this visit
        const existingTransaction = transactions.find(t => t.checkInId === updatedCheckIn.id)
        
        // Only create transaction items if they don't already exist
        if (!existingTransaction) {
          // Use TODAY's date for the transaction (when payment was actually received)
          // This ensures revenue is attributed to the day payment was received, not the original checkout day
          const paymentDate = new Date().toISOString().split('T')[0]
          
          // Create a transaction record
          const transaction: Transaction = {
            id: `transaction-${updatedCheckIn.id}-${Date.now()}`,
            date: paymentDate, // Use today's date - when payment was actually received
            type: 'income',
            description: `Payment for visit - ${updatedCheckIn.visitorName || existingCheckIn?.visitorName || 'Unknown'}`,
            amount: updatedCheckIn.totalAmount || 0,
            category: 'Service Revenue',
            paymentMethod: 'cash', // Default, could be enhanced to track actual payment method
            checkInId: updatedCheckIn.id,
            branchId: updatedCheckIn.branchId,
            createdAt: new Date().toISOString()
          }
          await createTransaction(transaction)
          setTransactions(prev => [...prev, transaction])

          // Create transaction items for each paid service
          const paidServices = updatedCheckIn.services.filter(s => s.paymentStatus === 'paid')
          for (const service of paidServices) {
            const ti: TransactionItem = {
              id: `ti-${updatedCheckIn.id}-${service.serviceId}-${Date.now()}`,
              transactionId: transaction.id,
              type: 'service',
              itemId: service.serviceId,
              quantity: service.quantity,
              unitPrice: service.price,
              totalPrice: service.price * service.quantity,
              branchId: updatedCheckIn.branchId,
              createdAt: new Date().toISOString()
            }
            await createTransactionItem(ti)
            setTransactionItems(prev => [...prev, ti])
          }
        }
      }
    }

    // Also create transaction items when first checking out (from checked-in to checked-out)
    if (oldStatus === 'checked-in' && newStatus === 'checked-out' && updatedCheckIn.paymentStatus === 'paid') {
      // Check if a transaction already exists for this visit
      const existingTransaction = transactions.find(t => t.checkInId === updatedCheckIn.id)
      
      // Only create transaction items if they don't already exist
      if (!existingTransaction && updatedCheckIn.services) {
        // Create a transaction record
        const transaction: Transaction = {
          id: `transaction-${updatedCheckIn.id}-${Date.now()}`,
          date: updatedCheckIn.date || new Date().toISOString().split('T')[0],
          type: 'income',
          description: `Payment for visit - ${updatedCheckIn.visitorName}`,
          amount: updatedCheckIn.totalAmount || 0,
          category: 'Service Revenue',
          paymentMethod: 'cash',
          checkInId: updatedCheckIn.id,
          branchId: updatedCheckIn.branchId,
          createdAt: new Date().toISOString()
        }
        await createTransaction(transaction)
        setTransactions(prev => [...prev, transaction])

        // Create transaction items for each paid service
        const paidServices = updatedCheckIn.services.filter(s => s.paymentStatus === 'paid')
        for (const service of paidServices) {
          const ti: TransactionItem = {
            id: `ti-${updatedCheckIn.id}-${service.serviceId}-${Date.now()}`,
            transactionId: transaction.id,
            type: 'service',
            itemId: service.serviceId,
            quantity: service.quantity,
            unitPrice: service.price,
            totalPrice: service.price * service.quantity,
            branchId: updatedCheckIn.branchId,
            createdAt: new Date().toISOString()
          }
          await createTransactionItem(ti)
          setTransactionItems(prev => [...prev, ti])
        }
      }
    }
  }

  const handleMemberCreate = (member: Member) => {
    createMember(member)
    setMembers(prev => [...prev, member])
  }

  const handleMemberUpdate = (member: Member) => {
    updateMember(member)
    setMembers(prev => prev.map(m => m.id === member.id ? member : m))
  }

  const handleMemberDelete = (id: string) => {
    deleteMember(id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const handleCompanyCreate = (company: Company) => {
    createCompany(company)
    setCompanies(prev => [...prev, company])
  }

  const handleCompanyUpdate = (company: Company) => {
    updateCompany(company)
    setCompanies(prev => prev.map(c => c.id === company.id ? company : c))
  }

  const handleServiceCreate = (service: Service) => {
    createService(service)
    setServices(prev => [...prev, service])
  }

  const handleServiceUpdate = (service: Service) => {
    updateService(service)
    setServices(prev => prev.map(s => s.id === service.id ? service : s))
  }

  const handleExpenseCreate = (expense: Expense) => {
    createExpense(expense)
    setExpenses(prev => [...prev, expense])
  }

  const handleTransactionCreate = (transaction: Transaction) => {
    createTransaction(transaction)
    setTransactions(prev => [...prev, transaction])
  }

  const handleInvoiceCreate = (invoice: Invoice) => {
    createInvoice(invoice)
    setInvoices(prev => [...prev, invoice])
  }

  const handleInvoiceUpdate = (invoice: Invoice) => {
    updateInvoice(invoice)
    setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i))
  }

  const handleContractCreate = (contract: Contract) => {
    createContract(contract)
    setContracts(prev => [...prev, contract])
  }

  const handleBranchSelect = (branchId: string) => {
    setSelectedBranchId(branchId)
    setSelectedBranch(branchId)
  }

  const isTabAllowed = (tabId: Tab) => {
    if (user.role === 'admin') return true
    const frontDeskAllowed: Tab[] = ['dashboard', 'daily-operations', 'members', 'companies', 'inventory', 'invoices', 'contracts']
    return frontDeskAllowed.includes(tabId)
  }

  const handleLogout = () => {
    saveCurrentUser(null)
    setUser(null)
  }

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => {

    if (!isTabAllowed(id)) return null
    return (
      <button className={`tab-button ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
        <Icon size={18} strokeWidth={1.5} />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="The Circle" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.03em' }}>the circle </span>
          {/* Notification Bell */}
          <button
            onClick={() => setNotificationsPanelOpen(true)}
            className="notification-bell"
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  minWidth: '16px',
                  textAlign: 'center',
                }}
              >
                {unreadCount > 99 ? '99+': unreadCount}
              </span>
            )}
          </button>        </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />
        <div style={{ padding: '0 16px 16px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Logged in as:</div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />          <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{user.fullName}</span>
            <button onClick={handleLogout} className="button-secondary" style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px' }} title="Logout">
              <LogOut size={12} />
            </button>
          </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />        </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />
        <div style={{ padding: '0 16px 16px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            <Building size={14} />
            <span className="form-label" style={{ marginBottom: 0 }}>Branch</span>
          </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />          <select className="form-select" value={selectedBranchId || ''} onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedBranch(e.target.value); }}>

            {branches.filter(b => b.isActive).map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />
        <div className="sidebar-tabs">
          <TabButton id="daily-operations" label="Operations" icon={CalendarCheck} />
          <TabButton id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <TabButton id="members" label="Members" icon={Users} />
          <TabButton id="companies" label="Companies" icon={Building2} />
          <TabButton id="services" label="Services" icon={Coffee} />
          <TabButton id="properties" label="Properties" icon={Home} />
          <TabButton id="inventory" label="Inventory" icon={Package} />
          <TabButton id="expenses" label="Expenses" icon={Receipt} />
          <TabButton id="transactions" label="Transactions" icon={ArrowRightLeft} />
          <TabButton id="invoices" label="Invoices" icon={FileText} />
          <TabButton id="contracts" label="Contracts" icon={ScrollText} />
          <TabButton id="branches" label="Branches" icon={MapPin} />
          <TabButton id="analytics" label="Analytics" icon={BarChart3} />
        </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />      </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />      <div className="main-content">
        {activeTab === 'members' && <MembersTab members={members} companies={companies} services={services} onUpdateMembers={setMembers} />}
        {activeTab === 'companies' && <CompaniesTab companies={companies} members={members} services={services} onUpdateCompanies={setCompanies} onUpdateMembers={setMembers} />}
        {activeTab === 'services' && <ServicesTab services={services} branchId={selectedBranchId} branches={branches.map(b => ({ id: b.id, name: b.name }))} inventory={inventory} onUpdateServices={setServices} />}
        {activeTab === 'daily-operations' && (
          <DailyOperationsTab
            members={members}
            companies={companies}
            services={services}
            rooms={rooms}
            checkIns={checkIns}
            bookings={bookings}
            roomReservations={roomReservations}
            inventory={inventory}
            branchId={selectedBranchId}
            onCheckIn={handleCheckIn}
            onBooking={handleBooking}
            user={user}
          />
        )}
        {activeTab === 'dashboard' && (
          <DashboardTab
            checkIns={filteredCheckIns}
            bookings={bookings.filter(b => b.branchId === selectedBranchId)}
            transactionItems={transactionItems.filter(ti => ti.branchId === selectedBranchId)}
            services={filteredServices}
            rooms={rooms}
            members={members}
            companies={companies}
            onUpdateCheckIn={handleUpdateCheckIn}
            onUpdateBooking={async (updatedBooking) => {
              await updateBooking(updatedBooking)
              setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b))
            }}
          />
        )}
        {activeTab === 'properties' && (
          <AvailablePropertiesTab
            rooms={filteredRooms}
            onUpdateRooms={(updatedRooms) => {
              const allRooms = rooms.filter(r => r.branchId !== selectedBranchId)
              setRooms([...allRooms, ...updatedRooms])
            }}
            branchId={selectedBranchId}
          />
        )}
        {activeTab === 'branches' && <BranchesTab branches={branches} onUpdateBranches={setBranches} />}
        {activeTab === 'inventory' && (
          <EnhancedInventoryTab 
            inventory={inventory} 
            branches={branches} 
            selectedBranchId={selectedBranchId}
            user={user}
            onUpdateInventory={setInventory} 
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            branches={branches}
            selectedBranchId={selectedBranchId}
            onUpdateExpenses={(updatedExpenses) => {
              setExpenses(updatedExpenses)
              const newExpenses = updatedExpenses.filter(exp => !expenses.find(oldExp => oldExp.id === exp.id))
              newExpenses.forEach(async (expense) => {
                if (expense.amount > 0) {
                  const transaction: Transaction = {
                    id: `transaction-${Date.now()}-${Math.random()}`,
                    date: expense.date,
                    type: 'expense',
                    description: expense.description,
                    amount: expense.amount,
                    category: expense.category,
                    paymentMethod: 'cash',
                    expenseId: expense.id,
                    branchId: expense.branchId,
                    createdAt: new Date().toISOString()
                  }
                  await createTransaction(transaction)
                  setTransactions(prev => [...prev, transaction])

                  // Add normalized expense item
                  const ti: TransactionItem = {
                    id: `ti-${Date.now()}-${Math.random()}`,
                    transactionId: transaction.id,
                    type: 'service', // Using service as bucket for expense reporting for now
                    itemId: expense.category,
                    quantity: 1,
                    unitPrice: expense.amount,
                    totalPrice: expense.amount,
                    branchId: expense.branchId || '',
                    createdAt: new Date().toISOString()
                  }
                  await createTransactionItem(ti)
                  setTransactionItems(prev => [...prev, ti])
                }
              })
            }}
          />
        )}
        {activeTab === 'transactions' && <TransactionsTab transactions={transactions} branches={branches} checkIns={checkIns} expenses={expenses} selectedBranchId={selectedBranchId} onUpdateTransactions={setTransactions} onCreateInvoiceFromTransaction={(transaction) => { setAutoCreateInvoiceFromTransactionId(transaction.id); setActiveTab('invoices'); }} />}
        {activeTab === 'invoices' && <InvoicesTab invoices={invoices} transactions={transactions} branches={branches} selectedBranchId={selectedBranchId} onUpdateInvoices={setInvoices} autoCreateFromTransactionId={autoCreateInvoiceFromTransactionId} />}
        {activeTab === 'contracts' && <ContractsTab contracts={contracts} branches={branches} companies={companies} members={members} rooms={rooms.filter(r => r.branchId === selectedBranchId)} selectedBranchId={selectedBranchId} onUpdateContracts={setContracts} onCreateCompany={(company) => { setCompanies(prev => [...prev, company]) }} user={user} />}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            checkIns={checkIns}
            transactionItems={transactionItems}
            transactions={transactions}
            expenses={expenses}
            inventory={inventory}
            contracts={contracts}
            branches={branches}
            selectedBranchId={selectedBranchId}
            members={members}
            companies={companies}
            services={services}
          />
        )}
      </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />    </div>
      {/* Notifications Panel */}
      <NotificationsPanel
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDismiss={dismiss}
        onActionClick={(notification) => {
          setNotificationsPanelOpen(false)
          if (notification.actionUrl === '/contracts') {
            setActiveTab('contracts')
          }
        }}
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      />  )
}

export default App
