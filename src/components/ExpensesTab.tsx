import { useState, useMemo } from 'react'
import { Expense, Branch } from '../types'
import ExpenseForm from './ExpenseForm'
import { createExpense, updateExpense, deleteExpense } from '../utils/storage'

interface ExpensesTabProps {
  expenses: Expense[]
  branches: Branch[]
  selectedBranchId: string | null
  onUpdateExpenses: (expenses: Expense[]) => void
}

const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Utilities',
  'Maintenance',
  'Food & Beverages',
  'Rent',
  'Insurance',
  'Marketing',
  'Equipment',
  'Cleaning',
  'Other'
]

export default function ExpensesTab({ expenses, branches, selectedBranchId, onUpdateExpenses }: ExpensesTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Filter expenses by branch
  const filteredExpenses = useMemo(() => {
    let result = expenses.filter(exp =>
      !exp.branchId || exp.branchId === selectedBranchId
    )

    // Apply date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateFilter) {
      case 'today':
        result = result.filter(exp => {
          const expDate = new Date(exp.date)
          return expDate >= today && expDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        })
        break
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        result = result.filter(exp => new Date(exp.date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1)
        result = result.filter(exp => new Date(exp.date) >= monthAgo)
        break
      case 'custom':
        if (startDate && endDate) {
          result = result.filter(exp => {
            const expDate = exp.date
            return expDate >= startDate && expDate <= endDate
          })
        }
        break
      default:
        // 'all' - no date filtering
        break
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(exp => exp.category === categoryFilter)
    }

    // Sort by date (most recent first)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, selectedBranchId, dateFilter, categoryFilter, startDate, endDate])

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  }, [filteredExpenses])

  const expensesByCategory = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {}
    filteredExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount
    })
    return categoryTotals
  }, [filteredExpenses])

  const handleAdd = () => {
    setEditingExpense(null)
    setShowForm(true)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const handleSave = async (expense: Expense) => {
    if (editingExpense) {
      await updateExpense(expense)
      const updated = expenses.map(e => e.id === expense.id ? expense : e)
      onUpdateExpenses(updated)
    } else {
      await createExpense(expense)
      onUpdateExpenses([...expenses, expense])
    }
    setShowForm(false)
    setEditingExpense(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingExpense(null)
  }

  const handleDelete = async (expense: Expense) => {
    if (window.confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) {
      await deleteExpense(expense.id)
      const updated = expenses.filter(e => e.id !== expense.id)
      onUpdateExpenses(updated)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <>
      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Expenses Tracker
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Track and manage daily expenses
            </p>
          </div>
          <button className="button button-primary" onClick={handleAdd}>
            + Add Expense
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
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Total Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
              {totalExpenses.toFixed(2)} EGP
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Number of Expenses</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>
              {filteredExpenses.length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                Category Filter
              </label>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expenses by Category Summary */}
        {Object.keys(expensesByCategory).length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
              Expenses by Category
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(expensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <div
                    key={category}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>{category}</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
                      {amount.toFixed(2)} EGP
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="table-container">
          {filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <p>No expenses found for the selected filters.</p>
              <button className="button button-primary" onClick={handleAdd} style={{ marginTop: '16px' }}>
                Add Your First Expense
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(expense => {
                  const branchName = expense.branchId
                    ? branches.find(b => b.id === expense.branchId)?.name || 'Unknown'
                    : 'All Branches'

                  return (
                    <tr key={expense.id}>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{formatDate(expense.date)}</td>
                      <td style={{ fontWeight: '500', color: '#1e293b' }}>{expense.description}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1e40af',
                            fontSize: '12px'
                          }}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#dc2626', fontSize: '16px' }}>
                        {expense.amount.toFixed(2)} EGP
                      </td>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{branchName}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="button button-secondary"
                            onClick={() => handleEdit(expense)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleDelete(expense)}
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

