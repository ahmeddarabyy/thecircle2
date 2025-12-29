import { useState } from 'react'
import { InventoryItem } from '../types'

interface ReduceStockFormProps {
  item: InventoryItem
  onSave: (itemId: string, quantity: number, reason?: string) => void
  onCancel: () => void
}

export default function ReduceStockForm({ item, onSave, onCancel }: ReduceStockFormProps) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const qty = parseInt(quantity)
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity greater than 0')
      return
    }

    if (qty > item.currentStock) {
      alert(`Cannot reduce more than current stock (${item.currentStock} ${item.unit}${item.currentStock !== 1 ? 's' : ''})`)
      return
    }

    onSave(item.id, qty, reason.trim() || undefined)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Reduce Stock</h2>
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
            <label className="form-label">Quantity to Reduce *</label>
            <input
              type="number"
              className="form-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              max={item.currentStock}
              step="1"
              placeholder="Enter quantity"
              required
              autoFocus
            />
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              New stock will be: {item.currentStock} - {quantity || 0} = {item.currentStock - (parseInt(quantity) || 0)} {item.unit}{(item.currentStock - (parseInt(quantity) || 0)) !== 1 ? 's' : ''}
            </small>
            {parseInt(quantity) > item.currentStock && (
              <small style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                ⚠️ Cannot reduce more than current stock
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Reason (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Used in office, Damaged, etc."
            />
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Optional note about why stock is being reduced
            </small>
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="button button-primary"
              disabled={!quantity || parseInt(quantity) <= 0 || parseInt(quantity) > item.currentStock}
            >
              Reduce Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

