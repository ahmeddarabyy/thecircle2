import { useState, useEffect } from 'react'
import { Company, Member } from '../types'

interface CompanyFormProps {
  company: Company | null
  members: Member[]
  onSave: (company: Company) => void
  onCancel: () => void
}

export default function CompanyForm({ company, members, onSave, onCancel }: CompanyFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhoneNumber: '',
    pointOfContact: '',
    employeeIds: [] as string[],
    hasActiveContract: false
  })
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('')

  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.companyName,
        companyEmail: company.companyEmail,
        companyPhoneNumber: company.companyPhoneNumber,
        pointOfContact: company.pointOfContact,
        employeeIds: company.employeeIds,
        hasActiveContract: company.hasActiveContract
      })
    }
  }, [company])

  const handleEmployeeToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(memberId)
        ? prev.employeeIds.filter(id => id !== memberId)
        : [...prev.employeeIds, memberId]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newCompany: Company = {
      id: company?.id || `company-${Date.now()}`,
      companyName: formData.companyName,
      companyEmail: formData.companyEmail,
      companyPhoneNumber: formData.companyPhoneNumber,
      pointOfContact: formData.pointOfContact,
      employeeIds: formData.employeeIds,
      hasActiveContract: formData.hasActiveContract
    }
    onSave(newCompany)
  }

  const availableMembers = members.filter(m => !m.companyId || m.companyId === company?.id)
  
  // Filter members based on search query
  const filteredAvailableMembers = availableMembers.filter(member => {
    if (!employeeSearchQuery.trim()) return true
    
    const query = employeeSearchQuery.toLowerCase()
    return (
      member.fullName.toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query) ||
      (member.phoneNumber || '').includes(query) ||
      (member.occupation || '').toLowerCase().includes(query)
    )
  })

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{company ? 'Edit Company' : 'Add New Company'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company Email *</label>
            <input
              type="email"
              className="form-input"
              value={formData.companyEmail}
              onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company Phone Number *</label>
            <input
              type="tel"
              className="form-input"
              value={formData.companyPhoneNumber}
              onChange={(e) => setFormData({ ...formData, companyPhoneNumber: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Point of Contact *</label>
            <input
              type="text"
              className="form-input"
              value={formData.pointOfContact}
              onChange={(e) => setFormData({ ...formData, pointOfContact: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company Employees</label>
            <input
              type="text"
              placeholder="Search employees by name, email, phone..."
              value={employeeSearchQuery}
              onChange={(e) => setEmployeeSearchQuery(e.target.value)}
              className="form-input"
              style={{ marginBottom: '12px' }}
            />
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px' }}>
              {availableMembers.length === 0 ? (
                <p style={{ color: '#64748b', padding: '8px' }}>No available members. Add members first.</p>
              ) : filteredAvailableMembers.length === 0 ? (
                <p style={{ color: '#64748b', padding: '8px' }}>No members found matching "{employeeSearchQuery}"</p>
              ) : (
                filteredAvailableMembers.map(member => (
                  <label key={member.id} style={{ display: 'block', padding: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.employeeIds.includes(member.id)}
                      onChange={() => handleEmployeeToggle(member.id)}
                    />
                    {' '}{member.fullName} ({member.email || 'No email'})
                  </label>
                ))
              )}
            </div>
            {availableMembers.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Showing {filteredAvailableMembers.length} of {availableMembers.length} available members
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={formData.hasActiveContract}
                onChange={(e) => setFormData({ ...formData, hasActiveContract: e.target.checked })}
              />
              {' '}Has Active Private Room Monthly Contract
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {company ? 'Update' : 'Add'} Company
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

