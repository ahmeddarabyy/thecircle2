import { useState, useEffect } from 'react'
import { Expense, Branch } from '../types'

interface ExpenseFormProps {
  expense?: Expense | null
  branches: Branch[]
  selectedBranchId: string | null
  onSave: (expense: Expense) => void
  onCancel: () => void
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

export default function ExpenseForm({ expense, branches, selectedBranchId, onSave, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    description: expense?.description || '',
    amount: expense?.amount || 0,
    category: expense?.category || 'Other',
    isGlobal: !expense?.branchId,
    selectedBranchId: expense?.branchId || selectedBranchId || ''
  })

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        isGlobal: !expense.branchId,
        selectedBranchId: expense.branchId || selectedBranchId || ''
      })
    }
  }, [expense, selectedBranchId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description.trim()) {
      alert('Please enter a description')
      return
    }
    
    if (formData.amount <= 0) {
      alert('Please enter a valid amount greater than 0')
      return
    }

    if (!formData.isGlobal && !formData.selectedBranchId) {
      alert('Please select a branch or mark as global expense')
      return
    }

    const newExpense: Expense = {
      id: expense?.id || `expense-${Date.now()}`,
      date: formData.date,
      description: formData.description.trim(),
      amount: formData.amount,
      category: formData.category,
      branchId: formData.isGlobal ? undefined : formData.selectedBranchId,
      createdAt: expense?.createdAt || new Date().toISOString()
    }

    onSave(newExpense)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Office supplies purchase"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (EGP) *</label>
            <input
              type="number"
              className="form-input"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Branch Assignment *</label>
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}>
                <input
                  type="radio"
                  name="branchAssignment"
                  checked={formData.isGlobal}
                  onChange={() => setFormData({ ...formData, isGlobal: true })}
                  style={{ marginRight: '8px' }}
                />
                <span>Global (All Branches)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="branchAssignment"
                  checked={!formData.isGlobal}
                  onChange={() => setFormData({ ...formData, isGlobal: false })}
                  style={{ marginRight: '8px' }}
                />
                <span>Branch-Specific</span>
              </label>
            </div>
          </div>

          {!formData.isGlobal && (
            <div className="form-group">
              <label className="form-label">Select Branch *</label>
              <select
                className="form-select"
                value={formData.selectedBranchId}
                onChange={(e) => setFormData({ ...formData, selectedBranchId: e.target.value })}
                required={!formData.isGlobal}
              >
                <option value="">Select a branch...</option>
                {branches.filter(b => b.isActive).map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

