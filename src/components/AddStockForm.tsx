import { useState } from 'react'
import { InventoryItem } from '../types'

interface AddStockFormProps {
  item: InventoryItem
  onSave: (itemId: string, quantity: number, reason?: string) => void
  onCancel: () => void
}

export default function AddStockForm({ item, onSave, onCancel }: AddStockFormProps) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity greater than 0')
      return
    }

    onSave(item.id, qty, reason.trim() || undefined)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Stock</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Item</label>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>
                Current Stock: <strong>{item.currentStock}</strong> {item.unit}{item.currentStock !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity to Add *</label>
            <input
              type="number"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              step="1"
              placeholder="Enter quantity"
              required
              autoFocus
            />
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              New stock will be: {item.currentStock} + {quantity || 0} = {item.currentStock + (parseInt(quantity) || 0)} {item.unit}{(item.currentStock + (parseInt(quantity) || 0)) !== 1 ? 's' : ''}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Reason (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Restocked, New shipment, etc."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              Add Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

