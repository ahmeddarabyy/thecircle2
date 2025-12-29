import { useState } from 'react'
import { Member, Company, Service } from '../types'
import { createMember, updateMember, deleteMember } from '../utils/storage'
import MemberForm from './MemberForm'
import ImportContacts from './ImportContacts'
import { Download, UserPlus } from 'lucide-react'

interface MembersTabProps {
  members: Member[]
  companies: Company[]
  services: Service[]
  onUpdateMembers: (members: Member[]) => void
}

export default function MembersTab({ members, companies, onUpdateMembers }: MembersTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showImport, setShowImport] = useState(false)

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return 'Individual'
    const company = companies.find(c => c.id === companyId)
    return company ? company.companyName : 'Unknown'
  }

  // Show all members (both individual and company members)
  const activeMembers = members

  // Filter members based on search query
  const filteredMembers = activeMembers.filter(member => {
    if (!searchQuery.trim()) return true

    try {
      const query = searchQuery.toLowerCase()
      const companyName = getCompanyName(member.companyId).toLowerCase()

      return (
        (member.fullName || '').toLowerCase().includes(query) ||
        (member.email || '').toLowerCase().includes(query) ||
        (member.phoneNumber || '').includes(query) ||
        (member.occupation || '').toLowerCase().includes(query) ||
        (member.referralSource || '').toLowerCase().includes(query) ||
        companyName.includes(query)
      )
    } catch (error) {
      console.error('Error filtering members:', error)
      return true
    }
  })

  const handleAdd = () => {
    setEditingMember(null)
    setShowForm(true)
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setShowForm(true)
  }

  const handleSave = async (member: Member) => {
    if (editingMember) {
      // Update existing member
      await updateMember(member)
      const updated = members.map(m => m.id === member.id ? member : m)
      onUpdateMembers(updated)
    } else {
      // Add new member
      await createMember(member)
      onUpdateMembers([...members, member])
    }
    setShowForm(false)
    setEditingMember(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingMember(null)
  }

  const handleImport = async (importedMembers: Member[]) => {
    // Merge with existing members, avoiding duplicates by name
    const existingNames = new Set(members.map(m => m.fullName.toLowerCase()))
    const newMembers = importedMembers.filter(m => !existingNames.has(m.fullName.toLowerCase()))

    if (newMembers.length === 0) {
      alert('All contacts are already imported or no new contacts found.')
      setShowImport(false)
      return
    }

    // Deletion is not yet implemented in the UI for members in the provided snippet, 
    // but if it were, we would call deleteMember. 
    // Let's check if there is a delete button.
    // Save one by one to DB
    for (const m of newMembers) {
      await createMember(m)
    }

    onUpdateMembers([...members, ...newMembers])
    alert(`Successfully imported ${newMembers.length} new contact${newMembers.length !== 1 ? 's' : ''}!`)
    setShowImport(false)
  }

  return (
    <>
      {showImport && (
        <ImportContacts
          onImport={handleImport}
          onCancel={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <MemberForm
          member={editingMember}
          companies={companies}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div className="content-header">
        <div>
          <h1 className="content-title">Active Members</h1>
          <div style={{
            marginTop: '8px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>Total Active Members:</span>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              {activeMembers.length}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="button button-secondary"
            onClick={() => setShowImport(true)}
          >
            <Download size={16} />
            Import CSV
          </button>
          <button className="button button-primary" onClick={handleAdd}>
            <UserPlus size={16} />
            Add Member
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input"
          style={{ maxWidth: '400px' }}
        />
      </div>

      <div className="table-container">
        {activeMembers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No active members yet. Click "Add Member" to get started.</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>No members found matching "{searchQuery}"</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Occupation</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Referral Source</th>
                <th>Type</th>
                <th>Contract Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => (
                <tr key={member.id}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{member.fullName}</span>
                  </td>
                  <td>{member.occupation}</td>
                  <td>{member.email}</td>
                  <td>{member.phoneNumber}</td>
                  <td>{member.referralSource}</td>
                  <td>{getCompanyName(member.companyId)}</td>
                  <td>
                    <span className={`badge ${member.hasActiveContract ? 'badge-active' : 'badge-inactive'}`}>
                      {member.hasActiveContract ? 'Active' : 'No Contract'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="button button-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => handleEdit(member)}
                    >
                      Edit
                    </button>
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

