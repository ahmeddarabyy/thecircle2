import { useState, useEffect } from 'react'
import { InventoryItem, Branch } from '../types'

interface InventoryFormProps {
  item?: InventoryItem | null
  branches: Branch[]
  selectedBranchId: string | null
  onSave: (item: InventoryItem) => void
  onCancel: () => void
}

export default function InventoryForm({ item, branches, selectedBranchId, onSave, onCancel }: InventoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    currentStock: 0,
    unit: '',
    lowStockThreshold: '',
    isGlobal: true,
    selectedBranchId: ''
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        currentStock: item.currentStock,
        unit: item.unit,
        lowStockThreshold: item.lowStockThreshold?.toString() || '',
        isGlobal: !item.branchId,
        selectedBranchId: item.branchId || ''
      })
    } else {
      setFormData({
        name: '',
        currentStock: 0,
        unit: '',
        lowStockThreshold: '',
        isGlobal: true,
        selectedBranchId: selectedBranchId || ''
      })
    }
  }, [item, selectedBranchId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter an item name')
      return
    }

    if (!formData.unit.trim()) {
      alert('Please enter a unit (e.g., bottle, pack, bag)')
      return
    }

    const itemData: InventoryItem = {
      id: item?.id || `inv-${Date.now()}`,
      name: formData.name.trim(),
      currentStock: formData.currentStock,
      unit: formData.unit.trim(),
      lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
      branchId: formData.isGlobal ? undefined : formData.selectedBranchId
    }

    onSave(itemData)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{item ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Water Bottles"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Unit *</label>
            <input
              type="text"
              className="form-input"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="e.g., bottle, pack, bag, roll"
              required
            />
            <small className="form-helper-text">
              Unit of measurement (e.g., bottle, pack, bag, roll, cup)
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Stock</label>
            <input
              type="number"
              className="form-input"
              value={formData.currentStock}
              onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
              min="0"
            />
            <small className="form-helper-text">
              Starting stock quantity (you can add more later)
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Low Stock Threshold</label>
            <input
              type="number"
              className="form-input"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              min="0"
              placeholder="Optional"
            />
            <small className="form-helper-text">
              Alert when stock falls below this number (optional)
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Availability *</label>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="radio"
                  checked={formData.isGlobal}
                  onChange={() => setFormData({ ...formData, isGlobal: true })}
                  style={{ marginRight: '8px' }}
                />
                <span>Available at All Branches (Global)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!formData.isGlobal}
                  onChange={() => setFormData({ ...formData, isGlobal: false })}
                  style={{ marginRight: '8px' }}
                />
                <span>Branch-Specific</span>
              </label>
            </div>
            {!formData.isGlobal && (
              <select
                className="form-select"
                value={formData.selectedBranchId}
                onChange={(e) => setFormData({ ...formData, selectedBranchId: e.target.value })}
                required={!formData.isGlobal}
              >
                <option value="">Select Branch...</option>
                {branches.filter(b => b.isActive).map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

