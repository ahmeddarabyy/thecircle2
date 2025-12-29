import { useState, useMemo, useEffect } from 'react'
import { CheckIn, Expense, InventoryItem, Branch, Contract, TransactionItem, Transaction, Member, Company, Service, ContractPeriod } from '../types'
import { loadContractPeriods } from '../utils/storage'

interface AnalyticsDashboardProps {
  checkIns: CheckIn[]
  transactionItems: TransactionItem[]
  transactions?: Transaction[] // Add transactions to track payment dates
  expenses: Expense[]
  inventory: InventoryItem[]
  contracts: Contract[]
  branches: Branch[]
  selectedBranchId: string | null
  members?: Member[]
  companies?: Company[]
  services?: Service[]
}

type Period = 'day' | 'week' | 'month' | 'all' | 'custom'
type ViewType = 'branch' | 'global' | 'both'
type DayToDayPeriod = 'today' | 'yesterday' | 'this-week' | 'this-month'
type AnalyticsTab = 'overview' | 'revenue' | 'expenses' | 'inventory' | 'contracts' | 'day-to-day' | 'contract-revenue'

export default function AnalyticsDashboard({
  checkIns,
  transactionItems,
  transactions = [],
  expenses,
  inventory,
  contracts,
  branches,
  selectedBranchId,
  members = [],
  companies = [],
  services = []
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
  const [period, setPeriod] = useState<Period>('month')
  const [viewType, setViewType] = useState<ViewType>('both')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [dayToDayPeriod, setDayToDayPeriod] = useState<DayToDayPeriod>('today')
  const [contractPeriods, setContractPeriods] = useState<{ [contractId: string]: ContractPeriod[] }>({})

  // Get date range based on period
  const getDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today (23:59:59.999)

    if (period === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    switch (period) {
      case 'day':
        return { start: today, end: endOfToday }
      case 'week':
        const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000) // 7 days including today
        weekStart.setHours(0, 0, 0, 0)
        return { start: weekStart, end: endOfToday }
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        return { start: monthStart, end: endOfToday }
      default:
        return { start: new Date(0), end: new Date() }
    }
  }

  const dateRange = getDateRange()

  // Filter transaction items by date range and branch
  const filteredTransactionItems = useMemo(() => {
    return transactionItems.filter(ti => {
      const tiDate = new Date(ti.createdAt)
      const matchesDate = tiDate >= dateRange.start && tiDate <= dateRange.end
      const matchesBranch = viewType === 'both' || (viewType === 'branch' && ti.branchId === selectedBranchId)
      return matchesDate && matchesBranch
    })
  }, [transactionItems, dateRange, viewType, selectedBranchId])

  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(exp => {
      const expDate = new Date(exp.date)
      const expDateOnly = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())
      const startDateOnly = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate())
      const endDateOnly = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate())
      return expDateOnly >= startDateOnly && expDateOnly <= endDateOnly
    })
    if (viewType === 'branch' && selectedBranchId) {
      result = result.filter(exp => !exp.branchId || exp.branchId === selectedBranchId)
    }
    return result
  }, [expenses, dateRange, viewType, selectedBranchId])

  // Calculate revenue metrics using transactionItems (V2)
  const revenueMetrics = useMemo(() => {
    const totalRevenue = filteredTransactionItems.reduce((sum, ti) => sum + ti.totalPrice, 0)

    const revenueByType = {
      service: 0,
      room: 0,
      inventory: 0
    }

    const revenueByBranch: { [key: string]: number } = {}
    const dailyRevenue: { [key: string]: number } = {}

    filteredTransactionItems.forEach(ti => {
      // Breakdown by type
      if (revenueByType[ti.type] !== undefined) {
        revenueByType[ti.type] += ti.totalPrice
      }

      // Breakdown by branch
      const branchName = branches.find(b => b.id === ti.branchId)?.name || 'Unknown'
      revenueByBranch[branchName] = (revenueByBranch[branchName] || 0) + ti.totalPrice

      // Breakdown by date
      const dateKey = new Date(ti.createdAt).toISOString().split('T')[0]
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + ti.totalPrice
    })

    return {
      totalRevenue,
      revenueByType,
      revenueByBranch,
      dailyRevenue,
      transactionCount: filteredTransactionItems.length
    }
  }, [filteredTransactionItems, branches])

  // Calculate expense metrics
  const expenseMetrics = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const expensesByCategory: { [key: string]: number } = {}
    filteredExpenses.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount
    })
    return { totalExpenses, expensesByCategory }
  }, [filteredExpenses])

  const netProfit = revenueMetrics.totalRevenue - expenseMetrics.totalExpenses
  const profitMargin = revenueMetrics.totalRevenue > 0 ? (netProfit / revenueMetrics.totalRevenue) * 100 : 0

  // Load contract periods for all contracts
  useEffect(() => {
    const loadPeriods = async () => {
      const periodsMap: { [contractId: string]: ContractPeriod[] } = {}
      for (const contract of contracts) {
        const periods = await loadContractPeriods(contract.id)
        periodsMap[contract.id] = periods
      }
      setContractPeriods(periodsMap)
    }
    if (contracts.length > 0) {
      loadPeriods()
    }
  }, [contracts])

  // Get date range for day-to-day revenue
  const getDayToDayDateRange = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const endOfYesterday = new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)

    switch (dayToDayPeriod) {
      case 'today':
        return { start: today, end: endOfToday }
      case 'yesterday':
        return { start: yesterday, end: endOfYesterday }
      case 'this-week':
        const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
        weekStart.setHours(0, 0, 0, 0)
        return { start: weekStart, end: endOfToday }
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        monthStart.setHours(0, 0, 0, 0)
        return { start: monthStart, end: endOfToday }
      default:
        return { start: today, end: endOfToday }
    }
  }

  // Calculate day-to-day revenue based on when payment was actually received (transaction creation date)
  // This fixes the issue where moving from outstanding to checked-out doesn't show up
  const dayToDayRevenue = useMemo(() => {
    const dateRange = getDayToDayDateRange()
    
    // Create a map of visit IDs to visit data for quick lookup
    const visitMap = new Map<string, CheckIn>()
    checkIns.forEach(visit => {
      visitMap.set(visit.id, visit)
    })

    // Create a map of transaction IDs to transactions
    const transactionMap = new Map<string, any>()
    transactions.forEach(t => {
      if (t.checkInId) {
        transactionMap.set(t.checkInId, t)
      }
    })

    // Filter transaction items by:
    // 1. They must be service type
    // 2. They must be linked to a transaction that was created in the date range (when payment was received)
    // 3. The transaction must be linked to a checked-out, paid visit
    const filteredItems = transactionItems.filter(ti => {
      if (ti.type !== 'service') return false
      
      // Find the transaction for this item
      const transaction = transactions.find(t => t.id === ti.transactionId)
      if (!transaction) return false
      
      // Filter by transaction creation date (when payment was actually received)
      const transactionDate = new Date(transaction.createdAt)
      const matchesDate = transactionDate >= dateRange.start && transactionDate <= dateRange.end
      
      // Filter by branch
      const matchesBranch = viewType === 'both' || (viewType === 'branch' && ti.branchId === selectedBranchId)
      
      // Verify the visit is checked-out and paid
      if (transaction.checkInId) {
        const visit = visitMap.get(transaction.checkInId)
        if (!visit || visit.status !== 'checked-out' || visit.paymentStatus !== 'paid') {
          return false
        }
      }
      
      return matchesDate && matchesBranch
    })

    // Calculate total revenue from transaction items
    const totalRevenue = filteredItems.reduce((sum, ti) => sum + ti.totalPrice, 0)

    // Revenue by service (from transaction items)
    const revenueByService: { [serviceId: string]: { name: string; revenue: number; count: number } } = {}
    filteredItems.forEach(ti => {
      if (ti.type === 'service') {
        const serviceData = services.find(s => s.id === ti.itemId)
        const serviceName = serviceData?.name || 'Unknown Service'
        
        if (!revenueByService[ti.itemId]) {
          revenueByService[ti.itemId] = {
            name: serviceName,
            revenue: 0,
            count: 0
          }
        }
        revenueByService[ti.itemId].revenue += ti.totalPrice
        revenueByService[ti.itemId].count += ti.quantity
      }
    })

    // Revenue by member (from transactions linked to visits)
    const revenueByMember: { [memberId: string]: { name: string; revenue: number; visitCount: number } } = {}
    const memberVisitSet = new Set<string>() // Track unique visits per member
    
    // Revenue by company (from transactions linked to visits)
    const revenueByCompany: { [companyId: string]: { name: string; revenue: number; visitCount: number } } = {}
    const companyVisitSet = new Set<string>() // Track unique visits per company
    
    filteredItems.forEach(ti => {
      const transaction = transactions.find(t => t.id === ti.transactionId)
      if (transaction && transaction.checkInId) {
        const visit = visitMap.get(transaction.checkInId)
        if (visit && visit.visitorId) {
          if (visit.visitorType === 'member') {
            const memberId = visit.visitorId
            if (!revenueByMember[memberId]) {
              const member = members.find(m => m.id === memberId)
              revenueByMember[memberId] = {
                name: member?.fullName || visit.visitorName || 'Unknown Member',
                revenue: 0,
                visitCount: 0
              }
            }
            revenueByMember[memberId].revenue += ti.totalPrice
            
            // Count unique visits
            const visitKey = `${memberId}-${transaction.checkInId}`
            if (!memberVisitSet.has(visitKey)) {
              memberVisitSet.add(visitKey)
              revenueByMember[memberId].visitCount += 1
            }
          } else if (visit.visitorType === 'company') {
            const companyId = visit.visitorId
            if (!revenueByCompany[companyId]) {
              const company = companies.find(c => c.id === companyId)
              revenueByCompany[companyId] = {
                name: company?.companyName || visit.visitorName || 'Unknown Company',
                revenue: 0,
                visitCount: 0
              }
            }
            revenueByCompany[companyId].revenue += ti.totalPrice
            
            // Count unique visits
            const visitKey = `${companyId}-${transaction.checkInId}`
            if (!companyVisitSet.has(visitKey)) {
              companyVisitSet.add(visitKey)
              revenueByCompany[companyId].visitCount += 1
            }
          }
        }
      }
    })

    // Count unique checked-out visits
    const uniqueVisitIds = new Set(filteredItems.map(ti => {
      const transaction = transactions.find(t => t.id === ti.transactionId)
      return transaction?.checkInId
    }).filter(Boolean))
    const visitCount = uniqueVisitIds.size

    // Calculate outstanding transactions for the period
    const outstandingVisits = checkIns.filter(visit => {
      if (visit.status !== 'outstanding') return false
      // Filter by date (use check-in date or updated date)
      const visitDate = new Date(visit.date || visit.checkInTime || visit.createdAt || '')
      const matchesDate = visitDate >= dateRange.start && visitDate <= dateRange.end
      // Filter by branch
      const matchesBranch = viewType === 'both' || (viewType === 'branch' && visit.branchId === selectedBranchId)
      return matchesDate && matchesBranch
    })
    const outstandingCount = outstandingVisits.length
    const outstandingAmount = outstandingVisits.reduce((sum, v) => {
      const dueAmount = (v.totalAmount || 0) - (v.paidAmount || 0)
      return sum + dueAmount
    }, 0)

    // Calculate voided transactions for the period
    const voidedVisits = checkIns.filter(visit => {
      if (visit.status !== 'voided') return false
      // Filter by date
      const visitDate = new Date(visit.date || visit.checkInTime || visit.createdAt || '')
      const matchesDate = visitDate >= dateRange.start && visitDate <= dateRange.end
      // Filter by branch
      const matchesBranch = viewType === 'both' || (viewType === 'branch' && visit.branchId === selectedBranchId)
      return matchesDate && matchesBranch
    })
    const voidedCount = voidedVisits.length
    const voidedAmount = voidedVisits.reduce((sum, v) => sum + (v.totalAmount || 0), 0)

    // Top selling services
    const topServices = Object.values(revenueByService)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Top revenue members
    const topMembers = Object.values(revenueByMember)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Top revenue companies
    const topCompanies = Object.values(revenueByCompany)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      totalRevenue,
      revenueByService,
      revenueByMember,
      revenueByCompany,
      topServices,
      topMembers,
      topCompanies,
      visitCount,
      outstandingCount,
      outstandingAmount,
      outstandingVisits,
      voidedCount,
      voidedAmount,
      voidedVisits
    }
  }, [transactionItems, transactions, checkIns, dayToDayPeriod, viewType, selectedBranchId, members, companies, services])

  // Calculate contract revenue
  const contractRevenue = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status === 'active')
    const roomContracts = activeContracts.filter(c => c.type === 'private-room-monthly')
    const deskContracts = activeContracts.filter(c => c.type === 'private-desk')

    // Calculate MRR (Monthly Recurring Revenue) - sum of monthly fees from active contracts
    const totalMRR = activeContracts.reduce((sum, c) => sum + c.monthlyFee, 0)
    const roomMRR = roomContracts.reduce((sum, c) => sum + c.monthlyFee, 0)
    const deskMRR = deskContracts.reduce((sum, c) => sum + c.monthlyFee, 0)

    // Calculate total sales - sum of all paid contract periods
    let totalSales = 0
    let roomSales = 0
    let deskSales = 0

    Object.entries(contractPeriods).forEach(([contractId, periods]) => {
      const contract = contracts.find(c => c.id === contractId)
      if (!contract) return

      const paidPeriods = periods.filter(p => p.paymentStatus === 'paid')
      const paidAmount = paidPeriods.reduce((sum, p) => sum + p.amount, 0)
      totalSales += paidAmount

      if (contract.type === 'private-room-monthly') {
        roomSales += paidAmount
      } else if (contract.type === 'private-desk') {
        deskSales += paidAmount
      }
    })

    return {
      totalContracts: activeContracts.length,
      roomContracts: roomContracts.length,
      deskContracts: deskContracts.length,
      totalMRR,
      roomMRR,
      deskMRR,
      totalSales,
      roomSales,
      deskSales
    }
  }, [contracts, contractPeriods])

  const formatCurrency = (amount: number) => `${amount.toLocaleString()} EGP`
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>Analytics Dashboard</h1>
        <p style={{ color: '#64748b' }}>Detailed financial breakdown and business performance</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #e2e8f0', marginBottom: '32px', flexWrap: 'wrap' }}>
        {['overview', 'day-to-day', 'contract-revenue', 'revenue', 'expenses', 'inventory', 'contracts'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as AnalyticsTab)}
            style={{
              padding: '12px 0',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: activeTab === tab ? '2px solid #0f172a' : '2px solid transparent',
              color: activeTab === tab ? '#0f172a' : '#94a3b8',
              fontWeight: '600',
              cursor: 'pointer',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'day-to-day' ? 'Day to Day Revenue' : tab === 'contract-revenue' ? 'Contract Revenue' : tab}
          </button>
        ))}
      </div>

      {/* Filters Area */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="form-select" style={{ width: 'auto' }}>
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
        <select value={viewType} onChange={(e) => setViewType(e.target.value as ViewType)} className="form-select" style={{ width: 'auto' }}>
          <option value="both">Global View</option>
          <option value="branch">Current Branch</option>
        </select>
        <div style={{ fontSize: '14px', color: '#64748b', marginLeft: 'auto' }}>
          Showing data from <b>{dateRange.start.toLocaleDateString()}</b> to <b>{dateRange.end.toLocaleDateString()}</b>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Main Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div className="card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Total Revenue</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a' }}>{formatCurrency(revenueMetrics.totalRevenue)}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>All income streams</div>
            </div>
            <div className="card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Total Expenses</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444' }}>{formatCurrency(expenseMetrics.totalExpenses)}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Operational costs</div>
            </div>
            <div className="card" style={{ padding: '24px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Net Profit</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6' }}>{formatCurrency(netProfit)}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{profitMargin.toFixed(1)}% margin</div>
            </div>
          </div>

          {/* Business Segmentation (The V2 detailed data) */}
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Business Segmentation</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', color: '#64748b', marginBottom: '20px' }}>Revenue by Category</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Services & Passes', value: revenueMetrics.revenueByType.service, color: '#3b82f6' },
                  { label: 'Room Rentals', value: revenueMetrics.revenueByType.room, color: '#8b5cf6' },
                  { label: 'Inventory & F&B', value: revenueMetrics.revenueByType.inventory, color: '#f59e0b' }
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '500' }}>{item.label}</span>
                      <span style={{ fontWeight: '700' }}>{formatCurrency(item.value)}</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: item.color,
                        width: `${(item.value / revenueMetrics.totalRevenue * 100) || 0}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '15px', color: '#64748b', marginBottom: '20px' }}>Top Branches</h3>
              {Object.entries(revenueMetrics.revenueByBranch).sort((a, b) => b[1] - a[1]).map(([name, val]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px' }}>{name}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{formatCurrency(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'revenue' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Daily Revenue Stream</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(revenueMetrics.dailyRevenue).sort((a, b) => b[0].localeCompare(a[0])).map(([date, val]) => (
              <div key={date} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontWeight: '500' }}>{formatDate(date)}</span>
                <span style={{ fontWeight: '700', color: '#16a34a' }}>{formatCurrency(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Expenses by Category</h2>
          {Object.entries(expenseMetrics.expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '14px' }}>{cat}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>{formatCurrency(val)}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'day-to-day' && (
        <div>
          {/* Day to Day Revenue Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>Day to Day Revenue</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <select
                value={dayToDayPeriod}
                onChange={(e) => setDayToDayPeriod(e.target.value as DayToDayPeriod)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
              </select>
              <select
                value={viewType}
                onChange={(e) => setViewType(e.target.value as ViewType)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="both">All Branches</option>
                <option value="branch">Current Branch</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* Total Revenue */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>{formatCurrency(dayToDayRevenue.totalRevenue)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{dayToDayRevenue.visitCount} checked-out visits</div>
            </div>

            {/* Outstanding */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #fbbf24',
              borderLeft: '4px solid #f59e0b'
            }}>
              <div style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outstanding</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>{formatCurrency(dayToDayRevenue.outstandingAmount)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{dayToDayRevenue.outstandingCount} unpaid visits</div>
            </div>

            {/* Voided */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #fca5a5',
              borderLeft: '4px solid #dc2626'
            }}>
              <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voided</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>{formatCurrency(dayToDayRevenue.voidedAmount)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{dayToDayRevenue.voidedCount} voided transactions</div>
            </div>
          </div>

          {/* Revenue by Service */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Revenue by Service</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.values(dayToDayRevenue.revenueByService).length > 0 ? (
                  Object.values(dayToDayRevenue.revenueByService)
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((service) => (
                      <div key={service.name} style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{service.name}</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatCurrency(service.revenue)}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{service.count} {service.count === 1 ? 'sale' : 'sales'}</div>
                      </div>
                    ))
                ) : (
                  <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No service revenue for this period</div>
                )}
              </div>
            </div>

            {/* Top Selling Services */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Top Selling Services</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dayToDayRevenue.topServices.length > 0 ? (
                  dayToDayRevenue.topServices.map((service, index) => (
                    <div key={service.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#d97706' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: index < 3 ? 'white' : '#6b7280',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{service.name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{service.count} {service.count === 1 ? 'sale' : 'sales'}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatCurrency(service.revenue)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No sales for this period</div>
                )}
              </div>
            </div>
          </div>

          {/* Top Revenue - Members and Companies side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Top Revenue Members */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Top Revenue Members</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dayToDayRevenue.topMembers.length > 0 ? (
                  dayToDayRevenue.topMembers.map((member, index) => (
                    <div key={member.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#d97706' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: index < 3 ? 'white' : '#6b7280',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{member.name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{member.visitCount} {member.visitCount === 1 ? 'visit' : 'visits'}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatCurrency(member.revenue)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No member revenue for this period</div>
                )}
              </div>
            </div>

            {/* Top Revenue Companies */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Top Revenue Companies</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dayToDayRevenue.topCompanies.length > 0 ? (
                  dayToDayRevenue.topCompanies.map((company, index) => (
                    <div key={company.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#6366f1' : index === 2 ? '#8b5cf6' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: index < 3 ? 'white' : '#6b7280',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{company.name}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{company.visitCount} {company.visitCount === 1 ? 'visit' : 'visits'}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{formatCurrency(company.revenue)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No company revenue for this period</div>
                )}
              </div>
            </div>
          </div>

          {/* Outstanding and Voided Transactions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Outstanding Transactions */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #fbbf24',
              borderTop: '4px solid #f59e0b'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#92400e' }}>Outstanding Transactions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {dayToDayRevenue.outstandingVisits.length > 0 ? (
                  dayToDayRevenue.outstandingVisits.map((visit) => {
                    // Look up visitor name
                    let visitorName = visit.visitorName || 'Unknown'
                    if (visit.visitorId && visit.visitorType === 'member') {
                      const member = members.find(m => m.id === visit.visitorId)
                      if (member) visitorName = member.fullName
                    } else if (visit.visitorId && visit.visitorType === 'company') {
                      const company = companies.find(c => c.id === visit.visitorId)
                      if (company) visitorName = company.companyName
                    }
                    const dueAmount = (visit.totalAmount || 0) - (visit.paidAmount || 0)
                    const visitDate = new Date(visit.date || visit.checkInTime || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    
                    return (
                      <div key={visit.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #fef3c7' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#f59e0b',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{visitorName}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{visitDate} • {visit.services?.length || 0} services</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>{formatCurrency(dueAmount)}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>due</div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No outstanding transactions</div>
                )}
              </div>
            </div>

            {/* Voided Transactions */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #fca5a5',
              borderTop: '4px solid #dc2626'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#991b1b' }}>Voided Transactions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {dayToDayRevenue.voidedVisits.length > 0 ? (
                  dayToDayRevenue.voidedVisits.map((visit) => {
                    // Look up visitor name
                    let visitorName = visit.visitorName || 'Unknown'
                    if (visit.visitorId && visit.visitorType === 'member') {
                      const member = members.find(m => m.id === visit.visitorId)
                      if (member) visitorName = member.fullName
                    } else if (visit.visitorId && visit.visitorType === 'company') {
                      const company = companies.find(c => c.id === visit.visitorId)
                      if (company) visitorName = company.companyName
                    }
                    const visitDate = new Date(visit.date || visit.checkInTime || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    
                    return (
                      <div key={visit.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #fee2e2' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#dc2626',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>{visitorName}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{visitDate} • {visit.voidReason || 'No reason provided'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626', textDecoration: 'line-through' }}>{formatCurrency(visit.totalAmount || 0)}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>voided</div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No voided transactions</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contract-revenue' && (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '32px' }}>Contract Revenue</h2>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Contracts</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{contractRevenue.totalContracts}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Active contracts</div>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total MRR</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{formatCurrency(contractRevenue.totalMRR)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Monthly Recurring Revenue</div>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sales</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{formatCurrency(contractRevenue.totalSales)}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>All paid periods</div>
            </div>
          </div>

          {/* Segmented by Contract Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Room Contracts */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Private Room Monthly</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Contracts</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{contractRevenue.roomContracts}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>MRR</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{formatCurrency(contractRevenue.roomMRR)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Sales</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(contractRevenue.roomSales)}</span>
                </div>
              </div>
            </div>

            {/* Desk Contracts */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Private Desk Monthly</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Contracts</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{contractRevenue.deskContracts}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>MRR</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{formatCurrency(contractRevenue.deskMRR)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Total Sales</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>{formatCurrency(contractRevenue.deskSales)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
      {activeTab === 'business-intelligence' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Business Intelligence</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecasting</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Next Month</span>
                  <span className="text-lg font-bold text-green-600">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">3-Month Projection</span>
                  <span className="text-lg font-bold text-blue-600">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <span className="text-lg font-bold text-purple-600">0.0%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Lifetime Value</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Member CLV</span>
                  <span className="text-lg font-bold text-indigo-600">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Company CLV</span>
                  <span className="text-lg font-bold text-red-600">$0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue per Visit</span>
                  <span className="text-lg font-bold text-green-600">$0</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">MoM Growth</span>
                  <span className="text-lg font-bold text-green-600">0.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">YoY Growth</span>
                  <span className="text-lg font-bold text-blue-600">0.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Contracts</span>
                  <span className="text-lg font-bold text-purple-600">0</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Key Metrics</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Total Revenue: $0</li>
                  <li>• Active Members: 0</li>
                  <li>• Active Companies: 0</li>
                  <li>• Pending Payments: 0</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Focus on contract renewals approaching due dates</li>
                  <li>• Identify high-value customers for retention</li>
                  <li>• Monitor payment collection trends</li>
                  <li>• Optimize service mix based on profitability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
