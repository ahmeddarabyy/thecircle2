import { useState, useEffect, useMemo } from 'react'
import { InventoryItem, Branch, InventoryHistory, User } from '../types'
import InventoryForm from './InventoryForm'
import AddStockForm from './AddStockForm'
import ReduceStockForm from './ReduceStockForm'
import { 
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem,
  loadInventoryHistory,
  createInventoryHistory
} from '../utils/storage'
import { Package, Search, History, TrendingUp, TrendingDown, Edit2, Trash2, Plus, Minus, AlertCircle, X } from 'lucide-react'

interface EnhancedInventoryTabProps {
  inventory: InventoryItem[]
  branches: Branch[]
  selectedBranchId: string | null
  user: User | null
  onUpdateInventory: (inventory: InventoryItem[]) => void
}

export default function EnhancedInventoryTab({ 
  inventory, 
  branches, 
  selectedBranchId, 
  user,
  onUpdateInventory 
}: EnhancedInventoryTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [showAddStockForm, setShowAddStockForm] = useState(false)
  const [showReduceStockForm, setShowReduceStockForm] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [addingStockToItem, setAddingStockToItem] = useState<InventoryItem | null>(null)
  const [reducingStockFromItem, setReducingStockFromItem] = useState<InventoryItem | null>(null)
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null)
  const [history, setHistory] = useState<InventoryHistory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all')
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Filter inventory by branch
  const filteredInventory = useMemo(() => {
    let filtered = selectedBranchId
      ? inventory.filter(item => !item.branchId || item.branchId === selectedBranchId)
      : inventory

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = getStockStatus(item).status
        return statusFilter === 'in-stock' && status === 'ok' ||
               statusFilter === 'low-stock' && status === 'low' ||
               statusFilter === 'out-of-stock' && status === 'out'
      })
    }

    return filtered
  }, [inventory, selectedBranchId, searchQuery, statusFilter])

  const getStockStatus = (item: InventoryItem) => {
    if (item.lowStockThreshold && item.currentStock <= item.lowStockThreshold) {
      return { status: 'low', color: '#f59e0b', label: 'Low Stock' }
    }
    if (item.currentStock === 0) {
      return { status: 'out', color: '#ef4444', label: 'Out of Stock' }
    }
    return { status: 'ok', color: '#10b981', label: 'In Stock' }
  }

  const handleAdd = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSave = async (item: InventoryItem) => {
    const oldItem = editingItem ? inventory.find(i => i.id === item.id) : null
    
    if (editingItem) {
      await updateInventoryItem(item)
      
      if (oldItem && oldItem.currentStock !== item.currentStock) {
        await createInventoryHistory({
          id: `history-${Date.now()}`,
          inventoryItemId: item.id,
          changeType: 'update',
          previousStock: oldItem.currentStock,
          newStock: item.currentStock,
          quantityChanged: item.currentStock - oldItem.currentStock,
          changedByUserId: user?.id,
          changedByUserName: user?.fullName || 'Unknown',
          branchId: selectedBranchId || undefined,
          createdAt: new Date().toISOString()
        })
      }
      
      const updated = inventory.map(i => i.id === item.id ? item : i)
      onUpdateInventory(updated)
    } else {
      await createInventoryItem(item)
      
      await createInventoryHistory({
        id: `history-${Date.now()}`,
        inventoryItemId: item.id,
        changeType: 'create',
        previousStock: 0,
        newStock: item.currentStock,
        quantityChanged: item.currentStock,
        changedByUserId: user?.id,
        changedByUserName: user?.fullName || 'Unknown',
        branchId: selectedBranchId || undefined,
        createdAt: new Date().toISOString()
      })
      
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

  const handleStockAdded = async (itemId: string, quantity: number, reason?: string) => {
    const item = inventory.find(i => i.id === itemId)
    if (!item) return

    const previousStock = item.currentStock
    const updatedItem = { ...item, currentStock: item.currentStock + quantity }
    await updateInventoryItem(updatedItem)

    await createInventoryHistory({
      id: `history-${Date.now()}`,
      inventoryItemId: itemId,
      changeType: 'add',
      previousStock: previousStock,
      newStock: updatedItem.currentStock,
      quantityChanged: quantity,
      changedByUserId: user?.id,
      changedByUserName: user?.fullName || 'Unknown',
      reason: reason,
      branchId: selectedBranchId || undefined,
      createdAt: new Date().toISOString()
    })

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

  const handleStockReduced = async (itemId: string, quantity: number, reason?: string) => {
    const item = inventory.find(i => i.id === itemId)
    if (!item) return

    const previousStock = item.currentStock
    const updatedItem = { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
    await updateInventoryItem(updatedItem)

    await createInventoryHistory({
      id: `history-${Date.now()}`,
      inventoryItemId: itemId,
      changeType: 'reduce',
      previousStock: previousStock,
      newStock: updatedItem.currentStock,
      quantityChanged: -quantity,
      changedByUserId: user?.id,
      changedByUserName: user?.fullName || 'Unknown',
      reason: reason,
      branchId: selectedBranchId || undefined,
      createdAt: new Date().toISOString()
    })

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
      
      await createInventoryHistory({
        id: `history-${Date.now()}`,
        inventoryItemId: item.id,
        changeType: 'delete',
        previousStock: item.currentStock,
        newStock: 0,
        quantityChanged: -item.currentStock,
        changedByUserId: user?.id,
        changedByUserName: user?.fullName || 'Unknown',
        branchId: selectedBranchId || undefined,
        createdAt: new Date().toISOString()
      })
      
      const updated = inventory.filter(i => i.id !== item.id)
      onUpdateInventory(updated)
    }
  }

  const handleViewHistory = async (item: InventoryItem) => {
    setSelectedItemForHistory(item)
    setShowHistoryModal(true)
    setLoadingHistory(true)
    
    const itemHistory = await loadInventoryHistory(item.id, selectedBranchId || undefined)
    setHistory(itemHistory)
    setLoadingHistory(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = useMemo(() => {
    const total = filteredInventory.length
    const inStock = filteredInventory.filter(i => getStockStatus(i).status === 'ok').length
    const lowStock = filteredInventory.filter(i => getStockStatus(i).status === 'low').length
    const outOfStock = filteredInventory.filter(i => getStockStatus(i).status === 'out').length
    
    return { total, inStock, lowStock, outOfStock }
  }, [filteredInventory])

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

      {/* History Modal - Apple-inspired minimal design */}
      {showHistoryModal && selectedItemForHistory && (
        <div 
          onClick={() => setShowHistoryModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Minimal Header */}
            <div style={{
              padding: '32px 32px 24px',
              borderBottom: '1px solid #f5f5f7',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h2 style={{ 
                  fontSize: '28px', 
                  fontWeight: '600', 
                  color: '#1d1d1f', 
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: '1.2'
                }}>
                  {selectedItemForHistory.name}
                </h2>
                <p style={{ 
                  fontSize: '15px', 
                  color: '#86868b', 
                  marginTop: '8px', 
                  margin: 0,
                  fontWeight: '400'
                }}>
                  Change history
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <X size={18} style={{ color: '#1d1d1f' }} />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div style={{
              padding: '24px 32px 32px',
              overflowY: 'auto',
              flex: 1
            }}>
              {loadingHistory ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: '#86868b',
                  fontSize: '15px'
                }}>
                  Loading...
                </div>
              ) : history.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px', 
                  color: '#86868b',
                  fontSize: '15px'
                }}>
                  No history available
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {history.map((h, index) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '20px',
                        backgroundColor: '#fbfbfd',
                        borderRadius: '12px',
                        border: '1px solid #f5f5f7',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f7'
                        e.currentTarget.style.borderColor = '#e5e5e7'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fbfbfd'
                        e.currentTarget.style.borderColor = '#f5f5f7'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        {/* Minimal Icon */}
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: h.changeType === 'add' ? '#f0fdf4' : 
                                         h.changeType === 'reduce' ? '#fef2f2' : 
                                         '#f5f5f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {h.changeType === 'add' && <TrendingUp size={18} style={{ color: '#10b981' }} />}
                          {h.changeType === 'reduce' && <TrendingDown size={18} style={{ color: '#ef4444' }} />}
                          {h.changeType === 'create' && <Plus size={18} style={{ color: '#007aff' }} />}
                          {h.changeType === 'delete' && <Trash2 size={18} style={{ color: '#ef4444' }} />}
                          {h.changeType === 'update' && <Edit2 size={18} style={{ color: '#86868b' }} />}
                        </div>
                        
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            marginBottom: '8px',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div>
                              <div style={{ 
                                fontWeight: '600', 
                                color: '#1d1d1f', 
                                fontSize: '17px',
                                marginBottom: '4px',
                                letterSpacing: '-0.01em'
                              }}>
                                {h.changeType === 'add' && 'Stock Added'}
                                {h.changeType === 'reduce' && 'Stock Reduced'}
                                {h.changeType === 'create' && 'Item Created'}
                                {h.changeType === 'update' && 'Item Updated'}
                                {h.changeType === 'delete' && 'Item Deleted'}
                              </div>
                              <div style={{ 
                                fontSize: '13px', 
                                color: '#86868b',
                                fontWeight: '400'
                              }}>
                                {h.changedByUserName || 'System'} • {formatDate(h.createdAt)}
                              </div>
                            </div>
                            <div style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              backgroundColor: h.quantityChanged > 0 ? '#f0fdf4' : 
                                             h.quantityChanged < 0 ? '#fef2f2' : 
                                             '#f5f5f7',
                              color: h.quantityChanged > 0 ? '#10b981' : 
                                     h.quantityChanged < 0 ? '#ef4444' : 
                                     '#86868b',
                              fontWeight: '600',
                              fontSize: '14px',
                              whiteSpace: 'nowrap'
                            }}>
                              {h.quantityChanged > 0 ? '+' : ''}{h.quantityChanged} {selectedItemForHistory.unit}
                            </div>
                          </div>
                          
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#6e6e73', 
                            marginTop: '12px',
                            fontWeight: '400'
                          }}>
                            <span style={{ fontWeight: '500' }}>{h.previousStock}</span>
                            <span style={{ margin: '0 8px', color: '#d2d2d7' }}>→</span>
                            <span style={{ fontWeight: '500' }}>{h.newStock}</span>
                            <span style={{ color: '#86868b', marginLeft: '4px' }}>
                              {selectedItemForHistory.unit}
                            </span>
                          </div>
                          
                          {h.reason && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#6e6e73', 
                              marginTop: '12px',
                              fontStyle: 'italic',
                              fontWeight: '400'
                            }}>
                              {h.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Apple-inspired minimal design */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header - Matching other tabs */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Inventory Management
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Track and manage inventory items across branches
            </p>
          </div>
          <button 
            onClick={handleAdd}
            style={{
              padding: '12px 24px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1d1d1f'
              e.currentTarget.style.borderColor = '#1d1d1f'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000'
              e.currentTarget.style.borderColor = '#000000'
            }}
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>

          {/* Minimal Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #f5f5f7',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '13px', color: '#86868b', marginBottom: '8px', fontWeight: '500' }}>
                Total Items
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.02em' }}>
                {stats.total}
              </div>
            </div>
            <div style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #f5f5f7',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '13px', color: '#86868b', marginBottom: '8px', fontWeight: '500' }}>
                In Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#10b981', letterSpacing: '-0.02em' }}>
                {stats.inStock}
              </div>
            </div>
            <div style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #f5f5f7',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ 
                fontSize: '13px', 
                color: '#86868b', 
                marginBottom: '8px', 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={12} />
                Low Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#f59e0b', letterSpacing: '-0.02em' }}>
                {stats.lowStock}
              </div>
            </div>
            <div style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #f5f5f7',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '13px', color: '#86868b', marginBottom: '8px', fontWeight: '500' }}>
                Out of Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#ef4444', letterSpacing: '-0.02em' }}>
                {stats.outOfStock}
              </div>
            </div>
          </div>

          {/* Minimal Search */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <div style={{ 
              position: 'relative', 
              flex: '1', 
              maxWidth: '400px'
            }}>
              <Search size={18} style={{ 
                position: 'absolute', 
                left: '16px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#86868b',
                pointerEvents: 'none'
              }} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  border: '1px solid #d2d2d7',
                  borderRadius: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: '#ffffff',
                  color: '#1d1d1f',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#007aff'
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 122, 255, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d2d2d7'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '14px 20px',
                border: '1px solid #d2d2d7',
                borderRadius: '12px',
                fontSize: '15px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                outline: 'none',
                color: '#1d1d1f',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#007aff'
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 122, 255, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d2d2d7'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>

        {/* Minimal Table */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #f5f5f7',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
        }}>
          {filteredInventory.length === 0 ? (
            <div style={{ 
              padding: '80px 20px', 
              textAlign: 'center',
              color: '#86868b'
            }}>
              <Package size={48} style={{ margin: '0 auto 20px', opacity: 0.3 }} />
              <p style={{ fontSize: '17px', marginBottom: '8px', color: '#1d1d1f', fontWeight: '500' }}>
                {searchQuery || statusFilter !== 'all' 
                  ? 'No items found' 
                  : 'No inventory items'}
              </p>
              <p style={{ fontSize: '15px', color: '#86868b' }}>
                {!searchQuery && statusFilter === 'all' 
                  ? 'Get started by adding your first item' 
                  : 'Try adjusting your search or filters'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <button 
                  onClick={handleAdd}
                  style={{
                    marginTop: '24px',
                    padding: '12px 24px',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    border: '1px solid #000000',
                    borderRadius: '12px',
                    fontSize: '15px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1d1d1f'
                    e.currentTarget.style.borderColor = '#1d1d1f'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000'
                    e.currentTarget.style.borderColor = '#000000'
                  }}
                >
                  Add Your First Item
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fbfbfd', borderBottom: '1px solid #f5f5f7' }}>
                    <th style={{ 
                      padding: '20px 24px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#86868b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px' 
                    }}>
                      Item
                    </th>
                    <th style={{ 
                      padding: '20px 24px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#86868b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px' 
                    }}>
                      Stock
                    </th>
                    <th style={{ 
                      padding: '20px 24px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#86868b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px' 
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      padding: '20px 24px', 
                      textAlign: 'left', 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#86868b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px' 
                    }}>
                      Branch
                    </th>
                    <th style={{ 
                      padding: '20px 24px', 
                      textAlign: 'right', 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#86868b', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px' 
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item, index) => {
                    const stockStatus = getStockStatus(item)
                    const branchName = item.branchId
                      ? branches.find(b => b.id === item.branchId)?.name || 'Unknown'
                      : 'All Branches'

                    return (
                      <tr 
                        key={item.id}
                        style={{ 
                          borderBottom: index < filteredInventory.length - 1 ? '1px solid #f5f5f7' : 'none',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#fbfbfd'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ fontWeight: '600', color: '#1d1d1f', fontSize: '16px', marginBottom: '4px' }}>
                            {item.name}
                          </div>
                          {item.lowStockThreshold && (
                            <div style={{ fontSize: '13px', color: '#86868b', fontWeight: '400' }}>
                              Alert at {item.lowStockThreshold} {item.unit}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{
                              fontSize: '24px',
                              fontWeight: '600',
                              color: '#1d1d1f',
                              letterSpacing: '-0.02em'
                            }}>
                              {item.currentStock}
                            </span>
                            <span style={{ color: '#86868b', fontSize: '15px', fontWeight: '400' }}>
                              {item.unit}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: stockStatus.status === 'ok' ? '#f0fdf4' : 
                                           stockStatus.status === 'low' ? '#fffbeb' : 
                                           '#fef2f2',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: stockStatus.color
                          }}>
                            {stockStatus.status === 'low' && <AlertCircle size={12} />}
                            {stockStatus.label}
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px', fontSize: '15px', color: '#6e6e73', fontWeight: '400' }}>
                          {branchName}
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap'
                          }}>
                            <button
                              onClick={() => handleViewHistory(item)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #d2d2d7',
                                borderRadius: '8px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#1d1d1f',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f7'
                                e.currentTarget.style.borderColor = '#86868b'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.borderColor = '#d2d2d7'
                              }}
                            >
                              <History size={14} />
                              History
                            </button>
                            <button
                              onClick={() => handleAddStock(item)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#059669'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981'
                                e.currentTarget.style.transform = 'translateY(0)'
                              }}
                            >
                              <Plus size={14} />
                              Add
                            </button>
                            <button
                              onClick={() => handleReduceStock(item)}
                              disabled={item.currentStock === 0}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: item.currentStock === 0 ? '#f5f5f7' : '#f59e0b',
                                color: item.currentStock === 0 ? '#86868b' : '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                cursor: item.currentStock === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (item.currentStock > 0) {
                                  e.currentTarget.style.backgroundColor = '#d97706'
                                  e.currentTarget.style.transform = 'translateY(-1px)'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (item.currentStock > 0) {
                                  e.currentTarget.style.backgroundColor = '#f59e0b'
                                  e.currentTarget.style.transform = 'translateY(0)'
                                }
                              }}
                            >
                              <Minus size={14} />
                              Reduce
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #d2d2d7',
                                borderRadius: '8px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#1d1d1f',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f7'
                                e.currentTarget.style.borderColor = '#86868b'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.borderColor = '#d2d2d7'
                              }}
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #fee2e2',
                                borderRadius: '8px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#ef4444',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fef2f2'
                                e.currentTarget.style.borderColor = '#fecaca'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.borderColor = '#fee2e2'
                              }}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
