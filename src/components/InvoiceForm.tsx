import { useState, useEffect } from 'react'
import { Invoice, Branch, Transaction } from '../types'

interface InvoiceFormProps {
  invoice?: Invoice | null
  transactions: Transaction[]
  branches: Branch[]
  selectedBranchId: string | null
  onSave: (invoice: Invoice) => void
  onCancel: () => void
}

export default function InvoiceForm({ 
  invoice, 
  transactions, 
  branches, 
  selectedBranchId, 
  onSave, 
  onCancel 
}: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    invoiceNumber: invoice?.invoiceNumber || '',
    date: invoice?.date || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || '',
    customerName: invoice?.customerName || '',
    customerEmail: invoice?.customerEmail || '',
    customerPhone: invoice?.customerPhone || '',
    customerAddress: invoice?.customerAddress || '',
    items: invoice?.items || [{ description: '', quantity: 1, unitPrice: 0, total: 0 }],
    taxRate: invoice?.taxRate || 0,
    discount: invoice?.discount || 0,
    status: invoice?.status || 'draft' as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
    paymentMethod: invoice?.paymentMethod || 'cash' as 'cash' | 'card' | 'bank_transfer' | 'other',
    paidDate: invoice?.paidDate || '',
    notes: invoice?.notes || '',
    isGlobal: !invoice?.branchId,
    selectedBranchId: invoice?.branchId || selectedBranchId || '',
    transactionId: invoice?.transactionId || ''
  })

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        dueDate: invoice.dueDate || '',
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail || '',
        customerPhone: invoice.customerPhone || '',
        customerAddress: invoice.customerAddress || '',
        items: invoice.items,
        taxRate: invoice.taxRate || 0,
        discount: invoice.discount || 0,
        status: invoice.status,
        paymentMethod: invoice.paymentMethod || 'cash',
        paidDate: invoice.paidDate || '',
        notes: invoice.notes || '',
        isGlobal: !invoice.branchId,
        selectedBranchId: invoice.branchId || selectedBranchId || '',
        transactionId: invoice.transactionId || ''
      })
    } else {
      // Generate invoice number for new invoice
      const invoiceCount = transactions.length + 1
      const year = new Date().getFullYear()
      const invoiceNum = `INV-${year}-${String(invoiceCount).padStart(4, '0')}`
      setFormData(prev => ({ ...prev, invoiceNumber: invoiceNum }))
    }
  }, [invoice, selectedBranchId, transactions.length])

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * (formData.taxRate / 100)
    const total = subtotal + tax - formData.discount
    return { subtotal, tax, total }
  }

  const { subtotal, tax, total } = calculateTotals()

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice
    }
    
    setFormData({ ...formData, items: updatedItems })
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    })
  }

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: updatedItems })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.invoiceNumber.trim()) {
      alert('Please enter an invoice number')
      return
    }
    
    if (!formData.customerName.trim()) {
      alert('Please enter customer name')
      return
    }

    if (formData.items.length === 0 || formData.items.some(item => !item.description.trim())) {
      alert('Please add at least one item with a description')
      return
    }

    if (!formData.isGlobal && !formData.selectedBranchId) {
      alert('Please select a branch or mark as global invoice')
      return
    }

    const newInvoice: Invoice = {
      id: invoice?.id || `invoice-${Date.now()}`,
      invoiceNumber: formData.invoiceNumber.trim(),
      date: formData.date,
      dueDate: formData.dueDate || undefined,
      customerName: formData.customerName.trim(),
      customerEmail: formData.customerEmail.trim() || undefined,
      customerPhone: formData.customerPhone.trim() || undefined,
      customerAddress: formData.customerAddress.trim() || undefined,
      items: formData.items.map(item => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal,
      tax: tax > 0 ? tax : undefined,
      taxRate: formData.taxRate > 0 ? formData.taxRate : undefined,
      discount: formData.discount > 0 ? formData.discount : undefined,
      total,
      status: formData.status,
      paymentMethod: formData.status === 'paid' ? formData.paymentMethod : undefined,
      paidDate: formData.status === 'paid' && formData.paidDate ? formData.paidDate : undefined,
      notes: formData.notes.trim() || undefined,
      branchId: formData.isGlobal ? undefined : formData.selectedBranchId,
      transactionId: formData.transactionId || undefined,
      createdAt: invoice?.createdAt || new Date().toISOString()
    }

    onSave(newInvoice)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">{invoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Invoice Number *</label>
              <input
                type="text"
                className="form-input"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Date *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Due Date (Optional)</label>
            <input
              type="date"
              className="form-input"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginTop: '24px', marginBottom: '16px' }}>
            Customer Information
          </h3>

          <div className="form-group">
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                className="form-input"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone (Optional)</label>
              <input
                type="tel"
                className="form-input"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address (Optional)</label>
            <textarea
              className="form-input"
              value={formData.customerAddress}
              onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              rows={2}
            />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginTop: '24px', marginBottom: '16px' }}>
            Invoice Items
          </h3>

          <div style={{ marginBottom: '16px' }}>
            {formData.items.map((item, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 1fr auto', 
                gap: '8px', 
                marginBottom: '8px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Description *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    placeholder="Item description"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Quantity *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>
                    Total
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={item.total.toFixed(2)}
                    readOnly
                    style={{ backgroundColor: '#f8fafc' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={formData.items.length === 1}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: formData.items.length === 1 ? '#cbd5e1' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: formData.items.length === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="button button-secondary"
              style={{ marginTop: '8px' }}
            >
              + Add Item
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div className="form-group">
              <label className="form-label">Tax Rate (%) (Optional)</label>
              <input
                type="number"
                className="form-input"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discount (EGP) (Optional)</label>
              <input
                type="number"
                className="form-input"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            backgroundColor: '#f8fafc', 
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b' }}>Subtotal:</span>
              <span style={{ fontWeight: '600' }}>{subtotal.toFixed(2)} EGP</span>
            </div>
            {tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Tax ({formData.taxRate}%):</span>
                <span style={{ fontWeight: '600' }}>{tax.toFixed(2)} EGP</span>
              </div>
            )}
            {formData.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Discount:</span>
                <span style={{ fontWeight: '600', color: '#dc2626' }}>-{formData.discount.toFixed(2)} EGP</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '2px solid #e2e8f0' }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>Total:</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#15803d' }}>{total.toFixed(2)} EGP</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                required
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {formData.status === 'paid' && (
              <>
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
                  <label className="form-label">Paid Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.paidDate}
                    onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Link to Transaction (Optional)</label>
                  <select
                    className="form-select"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  >
                    <option value="">None</option>
                    {transactions
                      .filter(t => t.type === 'income')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.description} - {t.amount} EGP - {new Date(t.date).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '24px' }}>
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

          <div className="form-group" style={{ marginTop: '24px' }}>
            <label className="form-label">Notes (Optional)</label>
            <textarea
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this invoice"
              rows={3}
            />
          </div>

          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {invoice ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

