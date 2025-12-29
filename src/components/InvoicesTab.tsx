import { useState, useMemo, useEffect } from 'react'
import { Invoice, Branch, Transaction } from '../types'
import InvoiceForm from './InvoiceForm'
import InvoiceView from './InvoiceView'
import { createInvoice, updateInvoice, deleteInvoice } from '../utils/storage'

interface InvoicesTabProps {
  invoices: Invoice[]
  transactions: Transaction[]
  branches: Branch[]
  selectedBranchId: string | null
  onUpdateInvoices: (invoices: Invoice[]) => void
  autoCreateFromTransactionId?: string | null
}

export default function InvoicesTab({
  invoices,
  transactions,
  branches,
  selectedBranchId,
  onUpdateInvoices,
  autoCreateFromTransactionId: propAutoCreateId
}: InvoicesTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(inv =>
      !inv.branchId || inv.branchId === selectedBranchId
    )

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter)
    }

    // Apply date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateFilter) {
      case 'today':
        result = result.filter(inv => {
          const invDate = new Date(inv.date)
          return invDate >= today && invDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
        })
        break
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        result = result.filter(inv => new Date(inv.date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1)
        result = result.filter(inv => new Date(inv.date) >= monthAgo)
        break
      case 'custom':
        if (startDate && endDate) {
          result = result.filter(inv => {
            const invDate = inv.date
            return invDate >= startDate && invDate <= endDate
          })
        }
        break
      default:
        break
    }

    // Sort by date (most recent first)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [invoices, selectedBranchId, statusFilter, dateFilter, startDate, endDate])

  const totalInvoiced = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.total, 0)
  }, [filteredInvoices])

  const totalPaid = useMemo(() => {
    return filteredInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0)
  }, [filteredInvoices])

  const totalPending = useMemo(() => {
    return filteredInvoices
      .filter(inv => inv.status === 'sent' || inv.status === 'draft')
      .reduce((sum, inv) => sum + inv.total, 0)
  }, [filteredInvoices])

  const handleAdd = () => {
    setEditingInvoice(null)
    setSelectedTransactionId(null)
    setShowForm(true)
  }

  const handleCreateFromTransaction = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    setSelectedTransactionId(transactionId)
    setEditingInvoice(null)
    setShowForm(true)
  }

  // Auto-create invoice when transaction ID is provided via prop
  useEffect(() => {
    if (propAutoCreateId && transactions.find(t => t.id === propAutoCreateId) && !showForm) {
      handleCreateFromTransaction(propAutoCreateId)
    }
  }, [propAutoCreateId, transactions, showForm])

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setSelectedTransactionId(null)
    setShowForm(true)
  }

  const handleView = (invoice: Invoice) => {
    setViewingInvoice(invoice)
  }

  const handleSave = async (invoice: Invoice) => {
    if (editingInvoice) {
      await updateInvoice(invoice)
      const updated = invoices.map(inv => inv.id === invoice.id ? invoice : inv)
      onUpdateInvoices(updated)
    } else {
      await createInvoice(invoice)
      onUpdateInvoices([...invoices, invoice])
    }
    setShowForm(false)
    setEditingInvoice(null)
    setSelectedTransactionId(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingInvoice(null)
    setSelectedTransactionId(null)
  }

  const handleDelete = async (invoice: Invoice) => {
    if (window.confirm(`Are you sure you want to delete invoice "${invoice.invoiceNumber}"?`)) {
      await deleteInvoice(invoice.id)
      const updated = invoices.filter(inv => inv.id !== invoice.id)
      onUpdateInvoices(updated)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: '#dcfce7', color: '#166534' }
      case 'sent':
        return { bg: '#dbeafe', color: '#1e40af' }
      case 'draft':
        return { bg: '#f3f4f6', color: '#374151' }
      case 'overdue':
        return { bg: '#fee2e2', color: '#991b1b' }
      case 'cancelled':
        return { bg: '#f3f4f6', color: '#6b7280' }
      default:
        return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  return (
    <>
      {showForm && (
        <InvoiceForm
          invoice={editingInvoice || (selectedTransactionId ? {
            id: '',
            invoiceNumber: '',
            date: new Date().toISOString().split('T')[0],
            customerName: transactions.find(t => t.id === selectedTransactionId)?.description || '',
            items: transactions.find(t => t.id === selectedTransactionId) ? [{
              description: transactions.find(t => t.id === selectedTransactionId)!.description,
              quantity: 1,
              unitPrice: transactions.find(t => t.id === selectedTransactionId)!.amount,
              total: transactions.find(t => t.id === selectedTransactionId)!.amount
            }] : [],
            subtotal: transactions.find(t => t.id === selectedTransactionId)?.amount || 0,
            total: transactions.find(t => t.id === selectedTransactionId)?.amount || 0,
            status: 'draft',
            createdAt: new Date().toISOString()
          } as Invoice : null)}
          transactions={transactions}
          branches={branches}
          selectedBranchId={selectedBranchId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {viewingInvoice && (
        <InvoiceView
          invoice={viewingInvoice}
          branch={branches.find(b => b.id === viewingInvoice.branchId)}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Invoices
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Create and manage invoices
            </p>
          </div>
          <button className="button button-primary" onClick={handleAdd}>
            + Create Invoice
          </button>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Total Invoiced</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>
              {totalInvoiced.toFixed(2)} EGP
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #86efac'
          }}>
            <div style={{ fontSize: '14px', color: '#166534', marginBottom: '8px' }}>Total Paid</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#15803d' }}>
              {totalPaid.toFixed(2)} EGP
            </div>
          </div>
          <div style={{
            padding: '20px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fde047'
          }}>
            <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '8px' }}>Pending</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>
              {totalPending.toFixed(2)} EGP
            </div>
          </div>
        </div>

        {/* Create from Transaction */}
        {transactions.filter(t => t.type === 'income' && !t.checkInId).length > 0 && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
              Create Invoice from Transaction
            </h3>
            <select
              className="form-select"
              value={selectedTransactionId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleCreateFromTransaction(e.target.value)
                }
              }}
              style={{ maxWidth: '400px' }}
            >
              <option value="">Select a transaction to create invoice...</option>
              {transactions
                .filter(t => t.type === 'income' && !t.checkInId)
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.description} - {t.amount} EGP - {formatDate(t.date)}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Filters */}
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Status Filter
            </label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Date Filter
            </label>
            <select
              className="form-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Invoices List */}
        <div className="table-container">
          {filteredInvoices.length === 0 ? (
            <div className="empty-state">
              <p>No invoices found for the selected filters.</p>
              <button className="button button-primary" onClick={handleAdd} style={{ marginTop: '16px' }}>
                Create Your First Invoice
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Branch</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(invoice => {
                  const branchName = invoice.branchId
                    ? branches.find(b => b.id === invoice.branchId)?.name || 'Unknown'
                    : 'All Branches'
                  const statusStyle = getStatusColor(invoice.status)

                  return (
                    <tr key={invoice.id}>
                      <td style={{ fontWeight: '600', color: '#1e293b' }}>{invoice.invoiceNumber}</td>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{formatDate(invoice.date)}</td>
                      <td style={{ fontWeight: '500', color: '#1e293b' }}>{invoice.customerName}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            fontSize: '12px'
                          }}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#15803d', fontSize: '16px' }}>
                        {invoice.total.toFixed(2)} EGP
                      </td>
                      <td style={{ fontSize: '14px', color: '#64748b' }}>{branchName}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="button button-secondary"
                            onClick={() => handleView(invoice)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            View
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleEdit(invoice)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => handleDelete(invoice)}
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

