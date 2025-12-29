import { useState, useEffect } from 'react'
import { Transaction, Branch, CheckIn, Expense } from '../types'

interface TransactionFormProps {
  transaction?: Transaction | null
  branches: Branch[]
  checkIns: CheckIn[]
  expenses: Expense[]
  selectedBranchId: string | null
  onSave: (transaction: Transaction) => void
  onCancel: () => void
}

const TRANSACTION_CATEGORIES = {
  income: ['Service Sales', 'Room Bookings', 'Membership Fees', 'Other Income'],
  expense: ['Office Supplies', 'Utilities', 'Maintenance', 'Food & Beverages', 'Rent', 'Insurance', 'Marketing', 'Equipment', 'Cleaning', 'Other']
}

export default function TransactionForm({ 
  transaction, 
  branches, 
  checkIns, 
  expenses,
  selectedBranchId, 
  onSave, 
  onCancel 
}: TransactionFormProps) {
  const [formData, setFormData] = useState({
    date: transaction?.date || new Date().toISOString().split('T')[0],
    type: transaction?.type || 'income' as 'income' | 'expense',
    description: transaction?.description || '',
    amount: transaction?.amount || 0,
    category: transaction?.category || '',
    paymentMethod: transaction?.paymentMethod || 'cash' as 'cash' | 'card' | 'bank_transfer' | 'other',
    reference: transaction?.reference || '',
    checkInId: transaction?.checkInId || '',
    expenseId: transaction?.expenseId || '',
    isGlobal: !transaction?.branchId,
    selectedBranchId: transaction?.branchId || selectedBranchId || '',
    notes: transaction?.notes || ''
  })

  useEffect(() => {
    if (transaction) {
      setFormData({
        date: transaction.date,
        type: transaction.type,
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        reference: transaction.reference || '',
        checkInId: transaction.checkInId || '',
        expenseId: transaction.expenseId || '',
        isGlobal: !transaction.branchId,
        selectedBranchId: transaction.branchId || selectedBranchId || '',
        notes: transaction.notes || ''
      })
    } else {
      setFormData(prev => ({
        ...prev,
        category: prev.category || (prev.type === 'income' ? TRANSACTION_CATEGORIES.income[0] : TRANSACTION_CATEGORIES.expense[0])
      }))
    }
  }, [transaction, selectedBranchId])

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

    if (!formData.category) {
      alert('Please select a category')
      return
    }

    if (!formData.isGlobal && !formData.selectedBranchId) {
      alert('Please select a branch or mark as global transaction')
      return
    }

    const newTransaction: Transaction = {
      id: transaction?.id || `transaction-${Date.now()}`,
      date: formData.date,
      type: formData.type,
      description: formData.description.trim(),
      amount: formData.amount,
      category: formData.category,
      paymentMethod: formData.paymentMethod,
      reference: formData.reference.trim() || undefined,
      checkInId: formData.checkInId || undefined,
      expenseId: formData.expenseId || undefined,
      branchId: formData.isGlobal ? undefined : formData.selectedBranchId,
      notes: formData.notes.trim() || undefined,
      createdAt: transaction?.createdAt || new Date().toISOString()
    }

    onSave(newTransaction)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{transaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
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
            <label className="form-label">Type *</label>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as 'income' | 'expense'
                setFormData({ 
                  ...formData, 
                  type: newType,
                  category: newType === 'income' ? TRANSACTION_CATEGORIES.income[0] : TRANSACTION_CATEGORIES.expense[0]
                })
              }}
              required
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <input
              type="text"
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Service payment, Office supplies purchase"
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
              <option value="">Select a category...</option>
              {(formData.type === 'income' ? TRANSACTION_CATEGORIES.income : TRANSACTION_CATEGORIES.expense).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method *</label>
            <select
              className="form-select"
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              required
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Number (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="e.g., Receipt #12345, Transaction ID"
            />
          </div>

          {formData.type === 'income' && (
            <div className="form-group">
              <label className="form-label">Link to Check-In (Optional)</label>
              <select
                className="form-select"
                value={formData.checkInId}
                onChange={(e) => setFormData({ ...formData, checkInId: e.target.value })}
              >
                <option value="">None</option>
                {checkIns
                  .filter(ci => ci.status === 'checked-out' || ci.status === 'checked-in')
                  .map(ci => (
                    <option key={ci.id} value={ci.id}>
                      {ci.memberName} - {new Date(ci.dateTime).toLocaleDateString()} - {ci.totalAmount} EGP
                    </option>
                  ))}
              </select>
            </div>
          )}

          {formData.type === 'expense' && (
            <div className="form-group">
              <label className="form-label">Link to Expense (Optional)</label>
              <select
                className="form-select"
                value={formData.expenseId}
                onChange={(e) => setFormData({ ...formData, expenseId: e.target.value })}
              >
                <option value="">None</option>
                {expenses.map(exp => (
                  <option key={exp.id} value={exp.id}>
                    {exp.description} - {exp.amount} EGP - {new Date(exp.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}

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

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this transaction"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {transaction ? 'Update Transaction' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

