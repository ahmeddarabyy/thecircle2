import { useState, useMemo } from 'react'
import { Transaction, Branch, CheckIn, Expense } from '../types'
import TransactionForm from './TransactionForm'

interface TransactionsTabProps {
  transactions: Transaction[]
  branches: Branch[]
  checkIns: CheckIn[]
  expenses: Expense[]
  selectedBranchId: string | null
  onUpdateTransactions: (transactions: Transaction[]) => void
  onCreateInvoiceFromTransaction?: (transaction: Transaction) => void
}

export default function TransactionsTab({ 
  transactions, 
  branches, 
  checkIns, 
  expenses,
  selectedBranchId, 
  onUpdateTransactions,
  onCreateInvoiceFromTransaction
}: TransactionsTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Helper function to get the correct transaction description
  // Fixes "undefined" or "Unknown" visitor names by looking up from linked check-in
  const getTransactionDescription = (transaction: Transaction): string => {
    // If it's not a visit payment, return the original description
    if (!transaction.description.startsWith('Payment for visit -')) {
      return transaction.description
    }
    
    // If the description has a valid name (not undefined/Unknown), return it
    const currentName = transaction.description.replace('Payment for visit - ', '')
    if (currentName && currentName !== 'undefined' && currentName !== 'Unknown' && currentName.trim() !== '') {
      return transaction.description
    }
    
    // Try to look up the visitor name from the linked check-in
    if (transaction.checkInId) {
      const linkedCheckIn = checkIns.find(ci => ci.id === transaction.checkInId)
      if (linkedCheckIn && linkedCheckIn.visitorName && linkedCheckIn.visitorName !== 'Unknown') {
        return `Payment for visit - ${linkedCheckIn.visitorName}`
      }
    }
    
    // Fallback to original description
    return transaction.description
  }

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => 
      !t.branchId || t.branchId === selectedBranchId
    )

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter)
    }

    // Apply date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dateFilter) {
      case 'today':
        result = result.filter(t => {
          const tDate = new Date(t.date)
          return tDate >= today && tDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        })
        break
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        result = result.filter(t => new Date(t.date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1)
        result = result.filter(t => new Date(t.date) >= monthAgo)
        break
      case 'custom':
        if (startDate && endDate) {
          result = result.filter(t => {
            const tDate = t.date
            return tDate >= startDate && tDate <= endDate
          })
        }
        break
      default:
        break
    }

    // Sort by date (most recent first)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, selectedBranchId, typeFilter, dateFilter, startDate, endDate])

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  }, [filteredTransactions])

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  }, [filteredTransactions])

  const netAmount = totalIncome - totalExpenses

  const handleAdd = () => {
    setEditingTransaction(null)
    setShowForm(true)
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowForm(true)
  }

  const handleSave = (transaction: Transaction) => {
    if (editingTransaction) {
      const updated = transactions.map(t => t.id === transaction.id ? transaction : t)
      onUpdateTransactions(updated)
    } else {
      onUpdateTransactions([...transactions, transaction])
    }
    setShowForm(false)
    setEditingTransaction(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingTransaction(null)
  }

  const handleDelete = (transaction: Transaction) => {
    if (window.confirm(`Are you sure you want to delete this transaction: "${getTransactionDescription(transaction)}"?`)) {
      const updated = transactions.filter(t => t.id !== transaction.id)
      onUpdateTransactions(updated)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <>
      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          branches={branches}
          checkIns={checkIns}
          expenses={expenses}
          selectedBranchId={selectedBranchId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Transactions
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Record and track all financial transactions
            </p>
          </div>
          <button className="button button-primary" onClick={handleAdd}>
            + Add Transaction
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '32px' 
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac'
          }}>
            <div style={{ fontSize: '14px', color: '#166534', marginBottom: '8px' }}>Total Income</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#15803d' }}>
              {totalIncome.toFixed(2)} EGP
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fca5a5'
          }}>
            <div style={{ fontSize: '14px', color: '#991b1b', marginBottom: '8px' }}>Total Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
              {totalExpenses.toFixed(2)} EGP
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: netAmount >= 0 ? '#eff6ff' : '#fef2f2',
            borderRadius: '8px',
            border: `1px solid ${netAmount >= 0 ? '#93c5fd' : '#fca5a5'}`
          }}>
            <div style={{ fontSize: '14px', color: netAmount >= 0 ? '#1e40af' : '#991b1b', marginBottom: '8px' }}>
              Net Amount
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: netAmount >= 0 ? '#2563eb' : '#dc2626' }}>
              {netAmount.toFixed(2)} EGP
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Type Filter
            </label>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Date Filter
            </label>
            <select
              className="form-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Transactions List */}
        <div className="table-container">
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions found for the selected filters.</p>
              <button className="button button-primary" onClick={handleAdd} style={{ marginTop: '16px' }}>
                Add Your First Transaction
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(transaction => {
                  const branchName = transaction.branchId 
                    ? branches.find(b => b.id === transaction.branchId)?.name || 'Unknown'
                    : 'All Branches'
                  
                  // Check if this is a void/reversal transaction
                  const isVoidReversal = transaction.category === 'Void Reversal' || transaction.amount < 0
                  const isVoided = transaction.description?.startsWith('VOIDED:')
                  
                  return (
                    <tr key={transaction.id} style={{ 
                      backgroundColor: isVoidReversal ? '#fef2f2' : undefined,
                      opacity: isVoidReversal ? 0.9 : 1
                    }}>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{formatDate(transaction.date)}</td>
                      <td>
                        <span 
                          className="badge"
                          style={{
                            backgroundColor: isVoidReversal ? '#fecaca' : (transaction.type === 'income' ? '#dcfce7' : '#fee2e2'),
                            color: isVoidReversal ? '#991b1b' : (transaction.type === 'income' ? '#166534' : '#991b1b'),
                            fontSize: '12px'
                          }}
                        >
                          {isVoidReversal ? 'Void' : (transaction.type === 'income' ? 'Income' : 'Expense')}
                        </span>
                      </td>
                      <td style={{ 
                        fontWeight: '500', 
                        color: isVoidReversal ? '#991b1b' : '#1e293b',
                        fontStyle: isVoided ? 'italic' : 'normal'
                      }}>{getTransactionDescription(transaction)}</td>
                      <td style={{ fontSize: '14px', color: isVoidReversal ? '#991b1b' : '#64748b' }}>{transaction.category}</td>
                      <td style={{ 
                        fontWeight: '600', 
                        color: isVoidReversal ? '#dc2626' : (transaction.type === 'income' ? '#15803d' : '#dc2626'),
                        fontSize: '16px' 
                      }}>
                        {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toFixed(2)} EGP
                      </td>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>
                        {transaction.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{branchName}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {transaction.type === 'income' && onCreateInvoiceFromTransaction && (
                            <button
                              className="button button-secondary"
                              onClick={() => onCreateInvoiceFromTransaction(transaction)}
                              style={{ 
                                padding: '4px 12px', 
                                fontSize: '12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                borderColor: '#3b82f6'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#2563eb'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#3b82f6'
                              }}
                            >
                              Generate Invoice
                            </button>
                          )}
                          <button
                            className="button button-secondary"
                            onClick={() => handleEdit(transaction)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleDelete(transaction)}
                            style={{ 
                              padding: '4px 12px', 
                              fontSize: '12px',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              borderColor: '#dc2626'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#b91c1c'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#dc2626'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
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

