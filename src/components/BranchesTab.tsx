import { useState } from 'react'
import { Branch } from '../types'
import BranchForm from './BranchForm'
import { createBranch, updateBranch, deleteBranch } from '../utils/storage'

interface BranchesTabProps {
  branches: Branch[]
  onUpdateBranches: (branches: Branch[]) => void
}

export default function BranchesTab({ branches, onUpdateBranches }: BranchesTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const handleAdd = () => {
    setEditingBranch(null)
    setShowForm(true)
  }

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setShowForm(true)
  }

  const handleSave = async (branch: Branch) => {
    if (editingBranch) {
      // Update existing branch
      await updateBranch(branch)
      const updated = branches.map(b => b.id === branch.id ? branch : b)
      onUpdateBranches(updated)
    } else {
      // Add new branch
      await createBranch(branch)
      onUpdateBranches([...branches, branch])
    }
    setShowForm(false)
    setEditingBranch(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingBranch(null)
  }

  const handleToggleActive = async (branch: Branch) => {
    const updatedBranch = { ...branch, isActive: !branch.isActive }
    await updateBranch(updatedBranch)
    const updated = branches.map(b =>
      b.id === branch.id ? updatedBranch : b
    )
    onUpdateBranches(updated)
  }

  const handleDelete = async (branch: Branch) => {
    if (branches.length === 1) {
      alert('You must have at least one branch. Cannot delete the last branch.')
      return
    }
    if (window.confirm(`Are you sure you want to delete "${branch.name}"? This will also delete all associated rooms, check-ins, and services for this branch. This action cannot be undone.`)) {
      await deleteBranch(branch.id)
      const updated = branches.filter(b => b.id !== branch.id)
      onUpdateBranches(updated)
    }
  }

  return (
    <>
      {showForm && (
        <BranchForm
          branch={editingBranch}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Branches
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Manage your branch locations. Companies and members are shared across all branches.
            </p>
          </div>
          <button className="button button-primary" onClick={handleAdd}>
            + Add Branch
          </button>
        </div>

        <div className="table-container">
          {branches.length === 0 ? (
            <div className="empty-state">
              <p>No branches configured yet.</p>
              <button className="button button-primary" onClick={handleAdd} style={{ marginTop: '16px' }}>
                Add Your First Branch
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(branch => (
                  <tr key={branch.id}>
                    <td style={{ fontWeight: '500', color: '#1e293b' }}>{branch.name}</td>
                    <td>{branch.address || '—'}</td>
                    <td>
                      {branch.phoneNumber && <div>{branch.phoneNumber}</div>}
                      {branch.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{branch.email}</div>}
                      {!branch.phoneNumber && !branch.email && '—'}
                    </td>
                    <td>
                      <span
                        className={`badge ${branch.isActive ? 'badge-active' : 'badge-inactive'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleActive(branch)}
                        title="Click to toggle status"
                      >
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="button button-secondary"
                          onClick={() => handleEdit(branch)}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        <button
                          className="button button-secondary"
                          onClick={() => handleDelete(branch)}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            borderColor: '#dc2626'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626'
                          }}
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
      </div>
    </>
  )
}

