import { useState, useMemo, useEffect } from 'react'
import { Contract, ContractPeriod, Branch, Company, Member, Room, User } from '../types'
import ContractForm from './ContractForm'
import ContractPeriodInvoice from './ContractPeriodInvoice'
import { createContract, updateContract, deleteContract, loadContracts, loadContractPeriods, createContractPeriod, updateContractPeriod, generateContractPeriods } from '../utils/storage'
import { Building2, User as UserIcon, ChevronDown, ChevronRight, FileText } from 'lucide-react'

interface ContractsTabProps {
  contracts: Contract[]
  branches: Branch[]
  companies: Company[]
  members: Member[]
  rooms: Room[]
  selectedBranchId: string | null
  onUpdateContracts: (contracts: Contract[]) => void
  onCreateCompany?: (company: Company) => void
  user: User | null
}

export default function ContractsTab({
  contracts,
  branches,
  companies,
  members,
  rooms,
  selectedBranchId,
  onUpdateContracts,
  onCreateCompany,
  user
}: ContractsTabProps) {
  const isAdmin = user?.role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [initialContractType, setInitialContractType] = useState<'private-room-monthly' | 'private-desk' | null>(null)
  const [activeView, setActiveView] = useState<'room' | 'desk'>('room') // 'room' for private room monthly, 'desk' for private desk monthly
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [contractPeriods, setContractPeriods] = useState<{ [contractId: string]: ContractPeriod[] }>({})
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set())
  const [invoicePeriod, setInvoicePeriod] = useState<{ contract: Contract; period: ContractPeriod } | null>(null)

  // Separate contracts by type
  // IMPORTANT: Show contracts for selected branch, or ALL contracts if no branch selected
  const roomContracts = useMemo(() => {
    if (!selectedBranchId) return contracts.filter(c => c.type === 'private-room-monthly')
    return contracts.filter(c => 
      c.type === 'private-room-monthly' && 
      c.branchId === selectedBranchId
    )
  }, [contracts, selectedBranchId])

  const deskContracts = useMemo(() => {
    if (!selectedBranchId) return contracts.filter(c => c.type === 'private-desk')
    return contracts.filter(c => 
      c.type === 'private-desk' && 
      c.branchId === selectedBranchId
    )
  }, [contracts, selectedBranchId])

  // Filter contracts based on active view and status
  const filteredContracts = useMemo(() => {
    const sourceContracts = activeView === 'room' ? roomContracts : deskContracts
    
    let result = sourceContracts

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    // Check for expired contracts (only for display, don't modify if contract was just created)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    result = result.map(contract => {
      // Only check expiry for contracts that are already active and have an endDate
      // Don't auto-expire contracts that were just created
      if (contract.status === 'active' && contract.endDate && contract.createdAt) {
        const endDate = new Date(contract.endDate)
        endDate.setHours(0, 0, 0, 0)
        // Only mark as expired if end date has passed AND contract was created more than 1 day ago
        const createdAt = new Date(contract.createdAt)
        const daysSinceCreation = (today.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
        // Only expire if end date passed AND contract is at least 1 day old
        if (endDate < today && daysSinceCreation >= 1) {
          return { ...contract, status: 'expired' as const }
        }
      }
      return contract
    })

    // Sort by start date (most recent first)
    return result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  }, [activeView, roomContracts, deskContracts, statusFilter])

  // Update contracts if any expired (only for existing contracts, not new ones)
  useEffect(() => {
    const checkExpiry = async () => {
      let changed = false
      const updatedContracts = contracts.map(contract => {
        // Only check expiry for contracts that are already active and have an endDate
        // Don't auto-expire contracts that were just created
        if (contract.status === 'active' && contract.endDate) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const endDate = new Date(contract.endDate)
          endDate.setHours(0, 0, 0, 0)
          // Only mark as expired if end date has passed AND contract was created more than 1 day ago
          // This prevents newly created contracts from being marked as expired
          if (contract.createdAt) {
            const createdAt = new Date(contract.createdAt)
            const daysSinceCreation = (today.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000)
            // Only expire if end date passed AND contract is at least 1 day old
            if (endDate < today && daysSinceCreation >= 1) {
              changed = true
              return { ...contract, status: 'expired' as const }
            }
          }
        }
        return contract
      })

      if (changed) {
        // Sync with DB
        for (const c of updatedContracts) {
          if (c.status === 'expired') await updateContract(c)
        }
        onUpdateContracts(updatedContracts)
      }
    }

    // Only run expiry check if contracts array has items
    if (contracts.length > 0) {
      checkExpiry()
    }
  }, [contracts, onUpdateContracts])

  // Calculate MRR (Monthly Recurring Revenue) - ONLY parent contracts' monthly fees
  // MRR is fixed and doesn't change with renewals - it's the recurring revenue from active contracts
  const mrr = useMemo(() => {
    const sourceContracts = activeView === 'room' ? roomContracts : deskContracts
    // MRR = sum of monthly fees from all active parent contracts
    return sourceContracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.monthlyFee, 0)
  }, [activeView, roomContracts, deskContracts])

  // Calculate total sales - sum of all paid contract periods
  const totalSales = useMemo(() => {
    let total = 0
    Object.values(contractPeriods).forEach(periods => {
      periods
        .filter(p => p.paymentStatus === 'paid')
        .forEach(p => total += p.amount)
    })
    return total
  }, [contractPeriods])

  // Load contract periods for all contracts
  useEffect(() => {
    const loadPeriods = async () => {
      const sourceContracts = activeView === 'room' ? roomContracts : deskContracts
      const periodsMap: { [contractId: string]: ContractPeriod[] } = {}
      
      for (const contract of sourceContracts) {
        const periods = await loadContractPeriods(contract.id)
        periodsMap[contract.id] = periods
      }
      
      setContractPeriods(periodsMap)
    }
    
    if (contracts.length > 0) {
      loadPeriods()
    }
  }, [contracts, activeView, roomContracts, deskContracts])

  // Toggle contract expansion to show/hide periods
  const toggleContractExpansion = (contractId: string) => {
    setExpandedContracts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contractId)) {
        newSet.delete(contractId)
      } else {
        newSet.add(contractId)
      }
      return newSet
    })
  }

  // Handle period payment status update
  const handlePeriodPaymentUpdate = async (period: ContractPeriod, newStatus: 'paid' | 'unpaid' | 'pending') => {
    const updatedPeriod = { ...period, paymentStatus: newStatus }
    if (newStatus === 'paid' && !period.paidDate) {
      updatedPeriod.paidDate = new Date().toISOString().split('T')[0]
    }
    await updateContractPeriod(updatedPeriod)
    
    // Reload periods for this contract
    const periods = await loadContractPeriods(period.contractId)
    setContractPeriods(prev => ({ ...prev, [period.contractId]: periods }))
  }

  // Handle period invoice status update
  const handlePeriodInvoiceUpdate = async (period: ContractPeriod) => {
    const updatedPeriod = { ...period, invoiceSent: !period.invoiceSent }
    await updateContractPeriod(updatedPeriod)
    
    // Reload periods for this contract
    const periods = await loadContractPeriods(period.contractId)
    setContractPeriods(prev => ({ ...prev, [period.contractId]: periods }))
  }

  // Each contract is separate - no grouping by company/member
  // Just create a flat list where each contract is its own "group"
  const groupedContracts = useMemo(() => {
    const sourceContracts = activeView === 'room' ? roomContracts : deskContracts
    
    // Sort contracts by start date (most recent first)
    const sorted = [...sourceContracts].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    
    // Create a map where each contract is its own group
    const groups: { [key: string]: Contract[] } = {}
    sorted.forEach(contract => {
      // Use contract ID as the group key so each contract is separate
      groups[contract.id] = [contract]
    })
    
    return groups
  }, [activeView, roomContracts, deskContracts])

  // Count contracts (each contract is separate now)
  const countUniqueContracts = (contracts: Contract[]): number => {
    return contracts.length
  }

  // Count active contracts
  const countActiveUniqueContracts = (contracts: Contract[]): number => {
    return contracts.filter(c => c.status === 'active').length
  }

  // Stats for room contracts (count renewals as one contract)
  const roomStats = useMemo(() => {
    const active = countActiveUniqueContracts(roomContracts)
    const total = countUniqueContracts(roomContracts)
    const revenue = roomContracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.monthlyFee, 0)
    return { active, total, revenue }
  }, [roomContracts])

  // Stats for desk contracts (count renewals as one contract)
  const deskStats = useMemo(() => {
    const active = countActiveUniqueContracts(deskContracts)
    const total = countUniqueContracts(deskContracts)
    const revenue = deskContracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.monthlyFee, 0)
    return { active, total, revenue }
  }, [deskContracts])

  const activeContracts = useMemo(() => {
    return countActiveUniqueContracts(filteredContracts)
  }, [filteredContracts])

  const totalMonthlyRevenue = useMemo(() => {
    return filteredContracts
      .filter(c => c.status === 'active')
      .reduce((sum, c) => sum + c.monthlyFee, 0)
  }, [filteredContracts])

  // Check if contract needs renewal (ended today or yesterday, not cancelled, auto-renew enabled)
  const needsRenewal = (contract: Contract): boolean => {
    if (contract.status === 'cancelled' || !contract.autoRenew) return false
    if (!contract.endDate) return false
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(contract.endDate)
    endDate.setHours(0, 0, 0, 0)
    
    // Check if ended today or yesterday (allow 1 day grace period)
    const daysDiff = Math.floor((today.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000))
    return daysDiff >= 0 && daysDiff <= 1
  }

  // Handle contract renewal - extends end date by one month and generates new period
  const handleRenew = async (contract: Contract) => {
    if (!contract.endDate) {
      alert('Contract must have an end date to renew')
      return
    }

    const endDate = new Date(contract.endDate)
    const nextEndDate = new Date(endDate)
    nextEndDate.setMonth(nextEndDate.getMonth() + 1) // Extend by one month
    
    // Calculate the new period (next month after current end date)
    const periodMonth = nextEndDate.getMonth() + 1
    const periodYear = nextEndDate.getFullYear()
    const monthName = nextEndDate.toLocaleString('default', { month: 'long' })
    const periodName = `${monthName} ${periodYear}`

    // Create new period for the renewal month
    const newPeriod: ContractPeriod = {
      id: `period-${contract.id}-${periodYear}-${periodMonth}-${Date.now()}`,
      contractId: contract.id,
      periodMonth,
      periodYear,
      periodName,
      amount: contract.monthlyFee,
      paymentStatus: 'unpaid',
      invoiceSent: false,
      createdAt: new Date().toISOString()
    }

    try {
      // Update contract end date
      const updatedContract = { ...contract, endDate: nextEndDate.toISOString().split('T')[0] }
      await updateContract(updatedContract)
      
      // Create new period
      await createContractPeriod(newPeriod)
      
      // Reload contracts and periods
      const reloadedContracts = await loadContracts()
      onUpdateContracts(reloadedContracts)
      
      const periods = await loadContractPeriods(contract.id)
      setContractPeriods(prev => ({ ...prev, [contract.id]: periods }))
      
      alert(`Contract renewed! New period "${periodName}" created.`)
    } catch (error: any) {
      console.error('Error renewing contract:', error)
      alert(`Failed to renew contract: ${error.message}`)
    }
  }

  const handleAdd = (type?: 'private-room-monthly' | 'private-desk') => {
    // Set to null to indicate new contract (not editing)
    setEditingContract(null)
    // Set initial type if provided
    setInitialContractType(type || null)
    setShowForm(true)
  }

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract)
    setShowForm(true)
  }

  const handleSave = async (contract: Contract) => {
    try {
      console.log('=== HANDLE SAVE START ===')
      console.log('Saving contract:', JSON.stringify(contract, null, 2))
      console.log('editingContract:', editingContract)
      console.log('editingContract?.id:', editingContract?.id)
      console.log('contract.id:', contract.id)
      
      // Check if this is actually an edit (contract exists in database) or a new contract
      const isExistingContract = editingContract && editingContract.id && editingContract.id !== '' && contracts.some(c => c.id === editingContract.id)
      
      console.log('isExistingContract:', isExistingContract)
      
      if (isExistingContract) {
        console.log('Updating existing contract:', contract.id)
        await updateContract(contract)
        // Reload contracts from database to ensure consistency
        const reloadedContracts = await loadContracts()
        console.log('Reloaded contracts after update:', reloadedContracts.length)
        onUpdateContracts(reloadedContracts)
      } else {
        console.log('Creating new contract')
        console.log('Contract type:', contract.type)
        console.log('Member ID:', contract.memberId)
        console.log('Company ID:', contract.companyId)
        console.log('Branch ID:', contract.branchId)
        
        console.log('=== CALLING createContract ===')
        let result
        try {
          result = await createContract(contract)
          console.log('Contract creation result:', result)
          
          // Generate and create contract periods for new contract
          const periods = generateContractPeriods(contract)
          console.log(`Creating ${periods.length} contract periods`)
          for (const period of periods) {
            await createContractPeriod(period)
          }
        } catch (createError: any) {
          console.error('❌❌❌ CREATE CONTRACT THREW ERROR ❌❌❌')
          console.error('Error object:', createError)
          console.error('Error message:', createError?.message)
          console.error('Error stack:', createError?.stack)
          alert(`❌ FAILED TO CREATE CONTRACT!\n\n${createError?.message || createError?.toString() || 'Unknown error'}\n\nCheck console for details.`)
          throw createError // Re-throw to prevent form from closing
        }
        
        // Wait a moment for database to sync
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Reload contracts from database to get the actual saved contract
        console.log('=== RELOADING CONTRACTS ===')
        const reloadedContracts = await loadContracts()
        console.log('Reloaded contracts count:', reloadedContracts.length)
        console.log('Selected branchId:', selectedBranchId)
        console.log('Contract branchId:', contract.branchId)
        console.log('All contracts:', reloadedContracts.map(c => ({ 
          id: c.id, 
          type: c.type, 
          branchId: c.branchId,
          memberId: c.memberId 
        })))
        
        // Check if our contract is in the reloaded list
        const foundContract = reloadedContracts.find(c => c.id === contract.id)
        console.log('Looking for contract ID:', contract.id)
        console.log('Found contract:', foundContract)
        
        if (!foundContract) {
          console.error('❌❌❌ CONTRACT NOT IN DATABASE! ❌❌❌')
          console.error('This means the INSERT FAILED!')
          console.error('Expected ID:', contract.id)
          console.error('Expected branchId:', contract.branchId)
          console.error('Reloaded contract IDs:', reloadedContracts.map(c => c.id))
          console.error('Reloaded contract branchIds:', reloadedContracts.map(c => ({ id: c.id, branchId: c.branchId })))
          
          alert(`❌ CONTRACT INSERT FAILED!\n\nThe contract was NOT saved to the database.\n\nContract ID: ${contract.id}\nBranch ID: ${contract.branchId}\n\nCheck the browser console (F12) for detailed error messages.\n\nMost likely cause: RLS policies blocking the insert.\n\nRun fix_contracts_rls.sql in Supabase SQL Editor.`)
          
          // DON'T close the form, DON'T update state
          return
        }
        
        // Check if contract will be visible (branchId matches)
        if (foundContract.branchId !== selectedBranchId && selectedBranchId) {
          console.warn('⚠️ CONTRACT SAVED BUT WILL BE FILTERED OUT!')
          console.warn('Contract branchId:', foundContract.branchId)
          console.warn('Selected branchId:', selectedBranchId)
          alert(`⚠️ Contract saved but may not appear!\n\nContract Branch: ${foundContract.branchId}\nSelected Branch: ${selectedBranchId}\n\nMake sure you selected the correct branch in the form.`)
        } else {
          console.log('✅ Contract saved and will be visible!')
        }
        
        console.log('✅ Updating contracts list')
        onUpdateContracts(reloadedContracts)
      }
      
      setShowForm(false)
      setEditingContract(null)
      setInitialContractType(null)
      console.log('=== HANDLE SAVE SUCCESS ===')
    } catch (error: any) {
      console.error('=== HANDLE SAVE ERROR ===')
      console.error('Error saving contract:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error?.message)
      console.error('Error stack:', error?.stack)
      console.error('Error code:', error?.code)
      console.error('Error details:', error?.details)
      console.error('Error hint:', error?.hint)
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
      
      // Show detailed error to user
      let errorMessage = 'Unknown error occurred'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.toString) {
        errorMessage = error.toString()
      }
      
      // Check for common issues
      if (error?.code === '42501' || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        errorMessage = 'Row Level Security (RLS) is blocking this insert. Please run the fix_contracts_table.sql script in Supabase to set up proper RLS policies.'
      } else if (error?.code === '42P01') {
        errorMessage = 'The contracts table does not exist. Please run the database schema script in Supabase.'
      } else if (error?.code === '23505') {
        errorMessage = 'A contract with this ID already exists.'
      } else if (error?.code === '23503') {
        errorMessage = 'Foreign key constraint violation. Please check that the member/company/branch IDs exist.'
      }
      
      alert(`❌ FAILED TO SAVE CONTRACT!\n\n${errorMessage}\n\nError Code: ${error?.code || 'N/A'}\n\nPlease check the browser console (F12) for more details.`)
      
      // Don't close the form if there's an error
      // setShowForm(false)
      // setEditingContract(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingContract(null)
    setInitialContractType(null)
  }

  const handleDelete = async (contract: Contract) => {
    if (!isAdmin) {
      alert('Only admins can delete contracts.')
      return
    }

    const contractName = contract.type === 'private-desk' 
      ? (members.find(m => m.id === contract.memberId)?.fullName || 'this contract')
      : (companies.find(c => c.id === contract.companyId)?.companyName || 'this contract')

    if (window.confirm(`Are you sure you want to delete the contract for ${contractName}?\n\nPeriod: ${formatDate(contract.startDate)} - ${contract.endDate ? formatDate(contract.endDate) : 'Open'}\n\nThis action cannot be undone.`)) {
      try {
        await deleteContract(contract.id)
        // Reload contracts from database to ensure consistency
        const reloadedContracts = await loadContracts()
        onUpdateContracts(reloadedContracts)
      } catch (error: any) {
        console.error('Error deleting contract:', error)
        alert(`Failed to delete contract: ${error.message || 'Unknown error'}`)
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#dcfce7', color: '#166534' }
      case 'expired':
        return { bg: '#fee2e2', color: '#991b1b' }
      case 'cancelled':
        return { bg: '#f3f4f6', color: '#6b7280' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  const isExpiringSoon = (contract: Contract) => {
    if (!contract.endDate || contract.status !== 'active') return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(contract.endDate)
    endDate.setHours(0, 0, 0, 0)
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  return (
    <>
      {showForm && (
        <ContractForm
          contract={editingContract}
          initialType={initialContractType}
          branches={branches}
          companies={companies}
          members={members}
          rooms={rooms}
          selectedBranchId={selectedBranchId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {invoicePeriod && (
        <ContractPeriodInvoice
          contract={invoicePeriod.contract}
          period={invoicePeriod.period}
          company={companies.find(c => c.id === invoicePeriod.contract.companyId)}
          member={members.find(m => m.id === invoicePeriod.contract.memberId)}
          branch={branches.find(b => b.id === invoicePeriod.contract.branchId)}
          onClose={() => setInvoicePeriod(null)}
          onSave={async (invoiceData) => {
            // Mark period as invoice sent
            const updatedPeriod = { ...invoicePeriod.period, invoiceSent: true }
            await updateContractPeriod(updatedPeriod)
            
            // Reload periods
            const periods = await loadContractPeriods(invoicePeriod.contract.id)
            setContractPeriods(prev => ({ ...prev, [invoicePeriod.contract.id]: periods }))
            
            // Optionally save invoice to database (if you have an invoices table)
            // await createInvoice(invoiceData)
            
            setInvoicePeriod(null)
            alert('Invoice generated and period marked as invoice sent!')
          }}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Contracts
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Manage private room monthly rentals (companies) and private desk monthly contracts (individual members)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="button button-secondary" 
              onClick={() => handleAdd('private-room-monthly')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Building2 size={16} />
              Add Room Contract
            </button>
            <button 
              className="button button-secondary" 
              onClick={() => handleAdd('private-desk')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <UserIcon size={16} />
              Add Desk Contract
            </button>
          </div>
        </div>

        {/* Contract Type Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0'
        }}>
          <button
            onClick={() => setActiveView('room')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: '500',
              border: 'none',
              borderBottom: activeView === 'room' ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeView === 'room' ? '#3b82f6' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'room') {
                e.currentTarget.style.color = '#1e293b'
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'room') {
                e.currentTarget.style.color = '#64748b'
              }
            }}
          >
            <Building2 size={18} />
            Private Room Monthly ({roomStats.total})
          </button>
          <button
            onClick={() => setActiveView('desk')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: '500',
              border: 'none',
              borderBottom: activeView === 'desk' ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeView === 'desk' ? '#3b82f6' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'desk') {
                e.currentTarget.style.color = '#1e293b'
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'desk') {
                e.currentTarget.style.color = '#64748b'
              }
            }}
          >
            <UserIcon size={18} />
            Private Desk Monthly ({deskStats.total})
          </button>
        </div>

        {/* MRR and Total Sales Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MRR</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{mrr.toLocaleString()} EGP</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Monthly Recurring Revenue</div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sales</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{totalSales.toLocaleString()} EGP</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>All paid periods</div>
          </div>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Contracts</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{activeView === 'room' ? roomStats.active : deskStats.active}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Total: {activeView === 'room' ? roomStats.total : deskStats.total}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
              Filter:
            </label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                minWidth: '160px'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            {filteredContracts.length} {filteredContracts.length === 1 ? 'contract' : 'contracts'}
          </div>
        </div>

        {/* Contracts List */}
        <div className="table-container">
          {Object.keys(groupedContracts).length === 0 ? (
            <div className="empty-state">
              <p>
                {activeView === 'room' 
                  ? 'No private room monthly contracts found for the selected filters.' 
                  : 'No private desk monthly contracts found for the selected filters.'}
              </p>
              <button 
                className="button button-primary" 
                onClick={() => handleAdd(activeView === 'room' ? 'private-room-monthly' : 'private-desk')} 
                style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '16px auto 0' }}
              >
                {activeView === 'room' ? <Building2 size={16} /> : <UserIcon size={16} />}
                Add Your First {activeView === 'room' ? 'Room' : 'Desk'} Contract
              </button>
            </div>
          ) : (
            <table className="table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '40px', padding: '12px 8px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}></th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>
                    {activeView === 'room' ? 'Company' : 'Member'}
                  </th>
                  {activeView === 'room' && (
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>
                      Room
                    </th>
                  )}
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>
                    Period
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>
                    Monthly Fee
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedContracts).map(([groupKey, contractGroup]) => {
                  const contract = contractGroup[0] // Each group has only one contract now
                  const company = contract.companyId ? companies.find(c => c.id === contract.companyId) : null
                  const member = contract.memberId ? members.find(m => m.id === contract.memberId) : null
                  const room = contract.roomId ? rooms.find(r => r.id === contract.roomId) : null
                  
                  const statusStyle = getStatusColor(contract.status)
                  const canRenew = needsRenewal(contract)
                  const isExpanded = expandedContracts.has(contract.id)
                  const periods = contractPeriods[contract.id] || []
                  const paidCount = periods.filter(p => p.paymentStatus === 'paid').length
                  const totalCount = periods.length

                  return (
                    <>
                      <tr 
                        key={contract.id}
                        style={{ 
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fafbfc'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        <td style={{ verticalAlign: 'middle', padding: '16px 8px' }}>
                          <button
                            onClick={() => toggleContractExpansion(contract.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6b7280',
                              borderRadius: '4px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3f4f6'
                              e.currentTarget.style.color = '#374151'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent'
                              e.currentTarget.style.color = '#6b7280'
                            }}
                            title={isExpanded ? 'Collapse periods' : 'Expand periods'}
                          >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                        <td style={{ fontWeight: '500', color: '#111827', verticalAlign: 'middle', padding: '16px' }}>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                            {activeView === 'room'
                              ? (company?.companyName || 'Unknown Company')
                              : (member?.fullName || 'Unknown Member')}
                          </div>
                          {activeView === 'desk' && member?.email && (
                            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '400', marginTop: '4px' }}>
                              {member.email}
                            </div>
                          )}
                        </td>
                        {activeView === 'room' && (
                          <td style={{ fontSize: '14px', color: '#6b7280', verticalAlign: 'middle', padding: '16px' }}>
                            {room?.name || 'N/A'}
                          </td>
                        )}
                        <td style={{ fontSize: '14px', color: '#374151', verticalAlign: 'middle', padding: '16px' }}>
                          <div>{formatDate(contract.startDate)} - {contract.endDate ? formatDate(contract.endDate) : 'Open'}</div>
                          {totalCount > 0 && (
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', fontWeight: '400' }}>
                              {paidCount}/{totalCount} paid
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: '600', color: '#059669', fontSize: '15px', verticalAlign: 'middle', padding: '16px' }}>
                          {contract.monthlyFee.toFixed(2)} EGP
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '16px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.color
                            }}
                          >
                            {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'middle', padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {canRenew && (
                              <button
                                onClick={() => handleRenew(contract)}
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '12px', 
                                  backgroundColor: '#10b981', 
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '500',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#059669'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#10b981'
                                }}
                              >
                                Renew
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(contract)}
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '12px', 
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e5e7eb'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6'
                              }}
                            >
                              Edit
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(contract)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '500',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fecaca'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fee2e2'
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && periods.length > 0 && (
                        <tr key={`${contract.id}-periods`}>
                          <td colSpan={activeView === 'room' ? 7 : 6} style={{ padding: '0', backgroundColor: '#fafbfc' }}>
                            <div style={{ padding: '24px', borderTop: '1px solid #e5e7eb' }}>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: '600', 
                                color: '#6b7280', 
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '20px' 
                              }}>
                                Monthly Periods ({paidCount}/{totalCount} paid)
                              </div>
                              <div style={{ 
                                backgroundColor: 'white', 
                                borderRadius: '8px', 
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden'
                              }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                      <th style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'left', 
                                        fontSize: '11px', 
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Period
                                      </th>
                                      <th style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'right', 
                                        fontSize: '11px', 
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Amount
                                      </th>
                                      <th style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'center', 
                                        fontSize: '11px', 
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Payment
                                      </th>
                                      <th style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'center', 
                                        fontSize: '11px', 
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Invoice
                                      </th>
                                      <th style={{ 
                                        padding: '12px 16px', 
                                        textAlign: 'right', 
                                        fontSize: '11px', 
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                      }}>
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {periods.map((period, idx) => (
                                      <tr 
                                        key={period.id}
                                        style={{ 
                                          borderBottom: idx < periods.length - 1 ? '1px solid #f3f4f6' : 'none',
                                          transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = '#f9fafb'
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = 'white'
                                        }}
                                      >
                                        <td style={{ padding: '14px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                                          {period.periodName}
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                                          {period.amount.toFixed(2)} EGP
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                          <button
                                            onClick={() => {
                                              const newStatus = period.paymentStatus === 'paid' ? 'unpaid' : period.paymentStatus === 'unpaid' ? 'pending' : 'paid'
                                              handlePeriodPaymentUpdate(period, newStatus)
                                            }}
                                            style={{
                                              padding: '6px 14px',
                                              borderRadius: '6px',
                                              fontSize: '12px',
                                              fontWeight: '500',
                                              backgroundColor: period.paymentStatus === 'paid' ? '#d1fae5' : period.paymentStatus === 'pending' ? '#fef3c7' : '#fee2e2',
                                              color: period.paymentStatus === 'paid' ? '#065f46' : period.paymentStatus === 'pending' ? '#92400e' : '#991b1b',
                                              border: 'none',
                                              cursor: 'pointer',
                                              transition: 'all 0.15s'
                                            }}
                                            title="Click: Unpaid → Pending → Paid"
                                          >
                                            {period.paymentStatus.charAt(0).toUpperCase() + period.paymentStatus.slice(1)}
                                          </button>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                          <button
                                            onClick={() => handlePeriodInvoiceUpdate(period)}
                                            style={{
                                              padding: '6px 14px',
                                              borderRadius: '6px',
                                              fontSize: '12px',
                                              fontWeight: '500',
                                              backgroundColor: period.invoiceSent ? '#dbeafe' : '#f3f4f6',
                                              color: period.invoiceSent ? '#1e40af' : '#6b7280',
                                              border: 'none',
                                              cursor: 'pointer',
                                              transition: 'all 0.15s'
                                            }}
                                            title="Toggle invoice sent status"
                                          >
                                            {period.invoiceSent ? '✓ Sent' : 'Not Sent'}
                                          </button>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                          <button
                                            onClick={() => setInvoicePeriod({ contract, period })}
                                            style={{
                                              padding: '6px 12px',
                                              borderRadius: '6px',
                                              fontSize: '12px',
                                              fontWeight: '500',
                                              backgroundColor: '#3b82f6',
                                              color: 'white',
                                              border: 'none',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.backgroundColor = '#2563eb'
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.backgroundColor = '#3b82f6'
                                            }}
                                            title="Generate invoice PDF"
                                          >
                                            <FileText size={14} />
                                            Invoice
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

