import { useState } from 'react'
import { Company, Member, Service } from '../types'
import CompanyForm from './CompanyForm'
import { createCompany, updateCompany, deleteCompany, updateMember } from '../utils/storage'

interface CompaniesTabProps {
  companies: Company[]
  members: Member[]
  services: Service[]
  onUpdateCompanies: (companies: Company[]) => void
  onUpdateMembers: (members: Member[]) => void
}

export default function CompaniesTab({
  companies,
  members,
  services,
  onUpdateCompanies,
  onUpdateMembers
}: CompaniesTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const getEmployeeNames = (employeeIds: string[]) => {
    return employeeIds
      .map(id => {
        const member = members.find(m => m.id === id)
        return member ? member.fullName : 'Unknown'
      })
      .join(', ') || 'No employees'
  }

  // Show all companies
  const activeCompanies = companies

  // Filter companies based on search query
  const filteredCompanies = activeCompanies.filter(company => {
    if (!searchQuery.trim()) return true

    try {
      const query = searchQuery.toLowerCase()
      const employeeNames = getEmployeeNames(company.employeeIds || []).toLowerCase()

      return (
        (company.companyName || '').toLowerCase().includes(query) ||
        (company.companyEmail || '').toLowerCase().includes(query) ||
        (company.companyPhoneNumber || '').includes(query) ||
        (company.pointOfContact || '').toLowerCase().includes(query) ||
        employeeNames.includes(query)
      )
    } catch (error) {
      console.error('Error filtering companies:', error)
      return true
    }
  })

  const handleAdd = () => {
    setEditingCompany(null)
    setShowForm(true)
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setShowForm(true)
  }

  const handleSave = async (company: Company) => {
    // Update members' companyId based on employee assignments
    const updatedMembers = [...members]
    const updatedMembersToPersist: Member[] = []

    if (editingCompany) {
      // Remove companyId from members who are no longer employees
      const removedEmployeeIds = editingCompany.employeeIds.filter(
        id => !company.employeeIds.includes(id)
      )
      removedEmployeeIds.forEach(memberId => {
        const memberIndex = updatedMembers.findIndex(m => m.id === memberId)
        if (memberIndex !== -1) {
          const updatedMember = { ...updatedMembers[memberIndex], companyId: undefined }
          updatedMembers[memberIndex] = updatedMember
          updatedMembersToPersist.push(updatedMember)
        }
      })
    }

    // Set companyId for all assigned employees
    company.employeeIds.forEach(memberId => {
      const memberIndex = updatedMembers.findIndex(m => m.id === memberId)
      if (memberIndex !== -1) {
        const updatedMember = { ...updatedMembers[memberIndex], companyId: company.id }
        updatedMembers[memberIndex] = updatedMember
        updatedMembersToPersist.push(updatedMember)
      }
    })

    // Persist member changes
    for (const m of updatedMembersToPersist) {
      await updateMember(m)
    }
    onUpdateMembers(updatedMembers)

    if (editingCompany) {
      // Update existing company
      await updateCompany(company)
      const updated = companies.map(c => c.id === company.id ? company : c)
      onUpdateCompanies(updated)
    } else {
      // Add new company
      await createCompany(company)
      onUpdateCompanies([...companies, company])
    }
    setShowForm(false)
    setEditingCompany(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCompany(null)
  }

  const handleDelete = async (company: Company) => {
    if (window.confirm(`Are you sure you want to delete "${company.companyName}"? This will not delete its members.`)) {
      await deleteCompany(company.id)
      const updated = companies.filter(c => c.id !== company.id)
      onUpdateCompanies(updated)
    }
  }

  return (
    <>
      <div className="content-header">
        <h1 className="content-title">Companies</h1>
        <button className="add-button" onClick={handleAdd}>
          + Add Company
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search companies by name, email, phone, contact person..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input"
          style={{ maxWidth: '400px', width: '100%' }}
        />
      </div>

      {showForm && (
        <CompanyForm
          company={editingCompany}
          members={members}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div className="table-container">
        {activeCompanies.length === 0 ? (
          <div className="empty-state">
            <p>No companies yet. Click "Add Company" to get started.</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="empty-state">
            <p>No companies found matching "{searchQuery}"</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Point of Contact</th>
                <th>Employees</th>
                <th>Contract Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map(company => (
                <tr key={company.id}>
                  <td>{company.companyName}</td>
                  <td>{company.companyEmail}</td>
                  <td>{company.companyPhoneNumber}</td>
                  <td>{company.pointOfContact}</td>
                  <td>{getEmployeeNames(company.employeeIds)}</td>
                  <td>
                    <span className={`badge ${company.hasActiveContract ? 'badge-active' : 'badge-inactive'}`}>
                      {company.hasActiveContract ? 'Active Contract' : 'No Contract'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="edit-button" onClick={() => handleEdit(company)}>
                        Edit
                      </button>
                      <button
                        className="edit-button"
                        onClick={() => handleDelete(company)}
                        style={{ backgroundColor: '#dc2626' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

