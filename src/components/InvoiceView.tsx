import { Invoice, Branch } from '../types'

interface InvoiceViewProps {
  invoice: Invoice
  branch?: Branch
  onClose: () => void
}

export default function InvoiceView({ invoice, branch, onClose }: InvoiceViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-print, .invoice-print * {
            visibility: visible;
          }
          .invoice-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal invoice-print" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="modal-header no-print">
            <h2 className="modal-title">Invoice</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="button button-secondary" onClick={handlePrint}>
                Print
              </button>
              <button className="close-button" onClick={onClose}>×</button>
            </div>
          </div>

          <div style={{ padding: '40px', backgroundColor: 'white' }}>
            {/* Header */}
            <div style={{ marginBottom: '40px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                    INVOICE
                  </h1>
                  {branch && (
                    <div style={{ color: '#64748b', fontSize: '14px' }}>
                      <div>{branch.name}</div>
                      {branch.address && <div>{branch.address}</div>}
                      {branch.phoneNumber && <div>Phone: {branch.phoneNumber}</div>}
                      {branch.email && <div>Email: {branch.email}</div>}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                    Invoice #{invoice.invoiceNumber}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '14px' }}>
                    <div>Date: {formatDate(invoice.date)}</div>
                    {invoice.dueDate && <div>Due Date: {formatDate(invoice.dueDate)}</div>}
                    <div style={{ marginTop: '8px' }}>
                      <span 
                        style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: invoice.status === 'paid' ? '#dcfce7' : 
                                         invoice.status === 'sent' ? '#dbeafe' :
                                         invoice.status === 'overdue' ? '#fee2e2' : '#f3f4f6',
                          color: invoice.status === 'paid' ? '#166534' : 
                                 invoice.status === 'sent' ? '#1e40af' :
                                 invoice.status === 'overdue' ? '#991b1b' : '#374151'
                        }}
                      >
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>
                Bill To
              </h3>
              <div style={{ fontSize: '16px', color: '#1e293b' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{invoice.customerName}</div>
                {invoice.customerAddress && <div style={{ color: '#64748b' }}>{invoice.customerAddress}</div>}
                {invoice.customerEmail && <div style={{ color: '#64748b' }}>Email: {invoice.customerEmail}</div>}
                {invoice.customerPhone && <div style={{ color: '#64748b' }}>Phone: {invoice.customerPhone}</div>}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '40px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                      Description
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                      Quantity
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                      Unit Price
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', color: '#1e293b' }}>{item.description}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{item.quantity}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>
                        {item.unitPrice.toFixed(2)} EGP
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>
                        {item.total.toFixed(2)} EGP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ marginLeft: 'auto', width: '300px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Subtotal:</span>
                <span style={{ fontWeight: '600' }}>{invoice.subtotal.toFixed(2)} EGP</span>
              </div>
              {invoice.tax && invoice.taxRate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Tax ({invoice.taxRate}%):</span>
                  <span style={{ fontWeight: '600' }}>{invoice.tax.toFixed(2)} EGP</span>
                </div>
              )}
              {invoice.discount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Discount:</span>
                  <span style={{ fontWeight: '600', color: '#dc2626' }}>-{invoice.discount.toFixed(2)} EGP</span>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '2px solid #1e293b',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                <span>Total:</span>
                <span style={{ color: '#15803d' }}>{invoice.total.toFixed(2)} EGP</span>
              </div>
            </div>

            {/* Payment Info */}
            {invoice.status === 'paid' && invoice.paymentMethod && invoice.paidDate && (
              <div style={{ 
                marginTop: '40px', 
                padding: '16px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '8px',
                border: '1px solid #86efac'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
                  Payment Received
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  <div>Payment Method: {invoice.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                  <div>Paid Date: {formatDate(invoice.paidDate)}</div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                  Notes
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b' }}>{invoice.notes}</div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              <div>Thank you for your business!</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

