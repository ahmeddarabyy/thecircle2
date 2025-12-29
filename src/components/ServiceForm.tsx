import { useState, useEffect } from 'react'
import { Service, InventoryItem } from '../types'

interface ServiceFormProps {
  service: Service | null
  branchId: string | null
  branches: { id: string; name: string }[]
  inventory: InventoryItem[]
  onSave: (service: Service) => void
  onCancel: () => void
}

export default function ServiceForm({ service, branchId, branches, inventory, onSave, onCancel }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    availableForMembers: false,
    availableForCompanies: false,
    type: 'one-time' as 'one-time' | 'contract',
    isGlobal: true,
    selectedBranchId: '',
    linkedToInventory: false,
    inventoryItemId: '',
    inventoryQuantityPerSale: 1
  })

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        price: service.price,
        availableForMembers: service.availableForMembers,
        availableForCompanies: service.availableForCompanies,
        type: service.type,
        isGlobal: !service.branchId,
        selectedBranchId: service.branchId || '',
        linkedToInventory: !!service.inventoryItemId,
        inventoryItemId: service.inventoryItemId || '',
        inventoryQuantityPerSale: service.inventoryQuantityPerSale || 1
      })
    } else {
      // For new services, default to current branch if available
      setFormData({
        name: '',
        price: 0,
        availableForMembers: false,
        availableForCompanies: false,
        type: 'one-time',
        isGlobal: false,
        selectedBranchId: branchId || '',
        linkedToInventory: false,
        inventoryItemId: '',
        inventoryQuantityPerSale: 1
      })
    }
  }, [service, branchId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newService: Service = {
      id: service?.id || `service-${Date.now()}`,
      name: formData.name,
      price: formData.price,
      availableForMembers: formData.availableForMembers,
      availableForCompanies: formData.availableForCompanies,
      type: formData.type,
      branchId: formData.isGlobal ? undefined : formData.selectedBranchId,
      inventoryItemId: formData.linkedToInventory ? formData.inventoryItemId : undefined,
      inventoryQuantityPerSale: formData.linkedToInventory ? formData.inventoryQuantityPerSale : undefined
    }
    onSave(newService)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{service ? 'Edit Service' : 'Add New Service'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Service Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Price (EGP) *</label>
            <input
              type="number"
              className="form-input"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              required
            />
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              For contracts, you can set price to 0
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
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {formData.isGlobal 
                ? 'This service will be available at all branches'
                : 'This service will only be available at the selected branch'}
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Service Type *</label>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'one-time' | 'contract' })}
              required
            >
              <option value="one-time">One-time Purchase</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Available For *</label>
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.availableForMembers}
                  onChange={(e) => setFormData({ ...formData, availableForMembers: e.target.checked })}
                />
                {' '}Members
              </label>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.availableForCompanies}
                  onChange={(e) => setFormData({ ...formData, availableForCompanies: e.target.checked })}
                />
                {' '}Companies
              </label>
            </div>
            {!formData.availableForMembers && !formData.availableForCompanies && (
              <small style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Please select at least one option
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Link to Inventory</label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={formData.linkedToInventory}
                onChange={(e) => setFormData({ ...formData, linkedToInventory: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span>This service consumes inventory items</span>
            </label>
            {formData.linkedToInventory && (
              <>
                <select
                  className="form-select"
                  value={formData.inventoryItemId}
                  onChange={(e) => setFormData({ ...formData, inventoryItemId: e.target.value })}
                  required={formData.linkedToInventory}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="">Select Inventory Item...</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (Current: {item.currentStock} {item.unit}{item.currentStock !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="form-input"
                  value={formData.inventoryQuantityPerSale}
                  onChange={(e) => setFormData({ ...formData, inventoryQuantityPerSale: parseInt(e.target.value) || 1 })}
                  min="1"
                  placeholder="Quantity per sale"
                  required={formData.linkedToInventory}
                />
                <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  How many inventory items are consumed when this service is sold (default: 1)
                </small>
              </>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="button button-primary"
              disabled={!formData.availableForMembers && !formData.availableForCompanies}
            >
              {service ? 'Update' : 'Add'} Service
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

