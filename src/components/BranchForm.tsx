import { useState, useEffect } from 'react'
import { Branch } from '../types'

interface BranchFormProps {
  branch?: Branch | null
  onSave: (branch: Branch) => void
  onCancel: () => void
}

export default function BranchForm({ branch, onSave, onCancel }: BranchFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
    isActive: true
  })

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        address: branch.address || '',
        phoneNumber: branch.phoneNumber || '',
        email: branch.email || '',
        isActive: branch.isActive
      })
    } else {
      setFormData({
        name: '',
        address: '',
        phoneNumber: '',
        email: '',
        isActive: true
      })
    }
  }, [branch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Please enter a branch name')
      return
    }

    const branchData: Branch = {
      id: branch?.id || `branch-${Date.now()}`,
      name: formData.name.trim(),
      address: formData.address.trim() || undefined,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      email: formData.email.trim() || undefined,
      isActive: formData.isActive
    }

    onSave(branchData)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{branch ? 'Edit Branch' : 'Add New Branch'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Branch Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Downtown Branch"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              className="form-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g., 123 Main Street, City"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="e.g., +20 123 456 7890"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g., branch@example.com"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span>Active Branch</span>
            </label>
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Inactive branches won't appear in branch selection
            </small>
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {branch ? 'Update Branch' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

