import { useState } from 'react'
import { InventoryItem, Branch } from '../types'
import InventoryForm from './InventoryForm'
import AddStockForm from './AddStockForm'
import ReduceStockForm from './ReduceStockForm'
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../utils/storage'

interface InventoryTabProps {
  inventory: InventoryItem[]
  branches: Branch[]
  selectedBranchId: string | null
  onUpdateInventory: (inventory: InventoryItem[]) => void
}

export default function InventoryTab({ inventory, branches, selectedBranchId, onUpdateInventory }: InventoryTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [showAddStockForm, setShowAddStockForm] = useState(false)
  const [showReduceStockForm, setShowReduceStockForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [addingStockToItem, setAddingStockToItem] = useState<InventoryItem | null>(null)
  const [reducingStockFromItem, setReducingStockFromItem] = useState<InventoryItem | null>(null)

  // Filter inventory by branch (show global items + branch-specific items)
  const filteredInventory = selectedBranchId
    ? inventory.filter(item => !item.branchId || item.branchId === selectedBranchId)
    : inventory

  const handleAdd = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSave = async (item: InventoryItem) => {
    if (editingItem) {
      // Update existing item
      await updateInventoryItem(item)
      const updated = inventory.map(i => i.id === item.id ? item : i)
      onUpdateInventory(updated)
    } else {
      // Add new item
      await createInventoryItem(item)
      onUpdateInventory([...inventory, item])
    }
    setShowForm(false)
    setEditingItem(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  const handleAddStock = (item: InventoryItem) => {
    setAddingStockToItem(item)
    setShowAddStockForm(true)
  }

  const handleStockAdded = async (itemId: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId)
    if (!item) return

    const updatedItem = { ...item, currentStock: item.currentStock + quantity }
    await updateInventoryItem(updatedItem)

    const updated = inventory.map(i =>
      i.id === itemId ? updatedItem : i
    )
    onUpdateInventory(updated)
    setShowAddStockForm(false)
    setAddingStockToItem(null)
  }

  const handleCancelAddStock = () => {
    setShowAddStockForm(false)
    setAddingStockToItem(null)
  }

  const handleReduceStock = (item: InventoryItem) => {
    if (item.currentStock === 0) {
      alert('Cannot reduce stock - item is already out of stock')
      return
    }
    setReducingStockFromItem(item)
    setShowReduceStockForm(true)
  }

  const handleStockReduced = async (itemId: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId)
    if (!item) return

    const updatedItem = { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
    await updateInventoryItem(updatedItem)

    const updated = inventory.map(i =>
      i.id === itemId ? updatedItem : i
    )
    onUpdateInventory(updated)
    setShowReduceStockForm(false)
    setReducingStockFromItem(null)
  }

  const handleCancelReduceStock = () => {
    setShowReduceStockForm(false)
    setReducingStockFromItem(null)
  }

  const handleDelete = async (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      await deleteInventoryItem(item.id)
      const updated = inventory.filter(i => i.id !== item.id)
      onUpdateInventory(updated)
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.lowStockThreshold && item.currentStock <= item.lowStockThreshold) {
      return { status: 'low', color: '#dc2626', label: 'Low Stock' }
    }
    if (item.currentStock === 0) {
      return { status: 'out', color: '#991b1b', label: 'Out of Stock' }
    }
    return { status: 'ok', color: '#166534', label: 'In Stock' }
  }

  return (
    <>
      {showForm && (
        <InventoryForm
          item={editingItem}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {showAddStockForm && addingStockToItem && (
        <AddStockForm
          item={addingStockToItem}
          onSave={handleStockAdded}
          onCancel={handleCancelAddStock}
        />
      )}

      {showReduceStockForm && reducingStockFromItem && (
        <ReduceStockForm
          item={reducingStockFromItem}
          onSave={handleStockReduced}
          onCancel={handleCancelReduceStock}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Inventory Management
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Track and manage inventory items across branches
            </p>
          </div>
          <button className="button button-primary" onClick={handleAdd}>
            + Add Item
          </button>
        </div>

        <div className="table-container">
          {filteredInventory.length === 0 ? (
            <div className="empty-state">
              <p>No inventory items configured yet.</p>
              <button className="button button-primary" onClick={handleAdd} style={{ marginTop: '16px' }}>
                Add Your First Item
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Current Stock</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const stockStatus = getStockStatus(item)
                  const branchName = item.branchId
                    ? branches.find(b => b.id === item.branchId)?.name || 'Unknown'
                    : 'All Branches'

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '500', color: '#1e293b' }}>{item.name}</td>
                      <td>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: stockStatus.color
                        }}>
                          {item.currentStock}
                        </span>
                        {' '}
                        <span style={{ color: '#64748b', fontSize: '14px' }}>
                          {item.unit}{item.currentStock !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>{item.unit}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: stockStatus.status === 'ok' ? '#dcfce7' :
                              stockStatus.status === 'low' ? '#fef3c7' : '#fee2e2',
                            color: stockStatus.color
                          }}
                        >
                          {stockStatus.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{branchName}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="button button-secondary"
                            onClick={() => handleAddStock(item)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Add Stock
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleReduceStock(item)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              backgroundColor: item.currentStock === 0 ? '#cbd5e1' : '#f59e0b',
                              color: item.currentStock === 0 ? '#64748b' : 'white',
                              borderColor: item.currentStock === 0 ? '#cbd5e1' : '#f59e0b',
                              cursor: item.currentStock === 0 ? 'not-allowed' : 'pointer'
                            }}
                            disabled={item.currentStock === 0}
                            onMouseEnter={(e) => {
                              if (item.currentStock > 0) {
                                e.currentTarget.style.backgroundColor = '#d97706'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (item.currentStock > 0) {
                                e.currentTarget.style.backgroundColor = '#f59e0b'
                              }
                            }}
                          >
                            Reduce Stock
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleEdit(item)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleDelete(item)}
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
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

