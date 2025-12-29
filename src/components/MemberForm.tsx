import { useState, useEffect } from 'react'
import { Member, Company } from '../types'

interface MemberFormProps {
  member: Member | null
  companies: Company[]
  onSave: (member: Member) => void
  onCancel: () => void
}

export default function MemberForm({ member, companies, onSave, onCancel }: MemberFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    occupation: '',
    phoneNumber: '',
    email: '',
    referralSource: '',
    companyId: '',
    hasActiveContract: false
  })

  useEffect(() => {
    if (member) {
      setFormData({
        fullName: member.fullName,
        occupation: member.occupation,
        phoneNumber: member.phoneNumber,
        email: member.email,
        referralSource: member.referralSource,
        companyId: member.companyId || '',
        hasActiveContract: member.hasActiveContract
      })
    }
  }, [member])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newMember: Member = {
      id: member?.id || `member-${Date.now()}`,
      fullName: formData.fullName,
      occupation: formData.occupation,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      referralSource: formData.referralSource,
      companyId: formData.companyId || undefined,
      hasActiveContract: formData.hasActiveContract
    }
    onSave(newMember)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{member ? 'Edit Member' : 'Add New Member'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Occupation *</label>
            <input
              type="text"
              className="form-input"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">How did they know about us? *</label>
            <input
              type="text"
              className="form-input"
              value={formData.referralSource}
              onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Company (Optional)</label>
            <select
              className="form-select"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
            >
              <option value="">Individual (No Company)</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                checked={formData.hasActiveContract}
                onChange={(e) => setFormData({ ...formData, hasActiveContract: e.target.checked })}
              />
              {' '}Has Active Private Desk Contract
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {member ? 'Update' : 'Add'} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

