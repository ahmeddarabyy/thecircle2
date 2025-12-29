import { useState, useEffect, useRef } from 'react'
import { Contract, ContractPeriod, Company, Member, Branch } from '../types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { X, Download, Save } from 'lucide-react'

interface ContractPeriodInvoiceProps {
  contract: Contract
  period: ContractPeriod
  company?: Company
  member?: Member
  branch?: Branch
  onClose: () => void
  onSave?: (invoiceData: any) => void
}

interface BrandingSettings {
  companyName: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyTaxId?: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  footerText: string
}

export default function ContractPeriodInvoice({
  contract,
  period,
  company,
  member,
  branch,
  onClose,
  onSave
}: ContractPeriodInvoiceProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  
  const [branding, setBranding] = useState<BrandingSettings>({
    companyName: 'The Circle',
    companyAddress: branch?.address || '',
    companyPhone: branch?.phoneNumber || '',
    companyEmail: branch?.email || '',
    companyTaxId: '',
    logoUrl: '/attachment-image.png', // Logo file - update this path to your logo filename
    primaryColor: '#000000',
    secondaryColor: '#1e293b',
    footerText: 'Thank you for your business!'
  })

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: period.periodYear && period.periodMonth 
      ? new Date(period.periodYear, period.periodMonth - 1, 15).toISOString().split('T')[0]
      : '',
    notes: `Invoice for ${period.periodName} - ${contract.type === 'private-room-monthly' ? 'Private Room Monthly' : 'Private Desk Monthly'}`,
    taxRate: 0,
    discount: 0
  })

  useEffect(() => {
    // Initialize branding with branch details if available
    if (branch) {
      setBranding(prev => ({
        ...prev,
        companyAddress: prev.companyAddress || branch.address || '',
        companyPhone: prev.companyPhone || branch.phoneNumber || '',
        companyEmail: prev.companyEmail || branch.email || ''
      }))
    }
    
    // Load saved branding from localStorage if available
    const savedBranding = localStorage.getItem('invoice-branding')
    if (savedBranding) {
      try {
        const parsed = JSON.parse(savedBranding)
        setBranding(prev => ({
          ...prev,
          ...parsed,
          // Don't override branch-specific details if they exist
          companyAddress: branch?.address || parsed.companyAddress || prev.companyAddress,
          companyPhone: branch?.phoneNumber || parsed.companyPhone || prev.companyPhone,
          companyEmail: branch?.email || parsed.companyEmail || prev.companyEmail
        }))
      } catch (e) {
        console.error('Error loading saved branding:', e)
      }
    }
  }, [branch])

  const customerName = contract.type === 'private-room-monthly' 
    ? (company?.companyName || 'Unknown Company')
    : (member?.fullName || 'Unknown Member')
  
  const customerEmail = contract.type === 'private-room-monthly'
    ? company?.companyEmail
    : member?.email

  const customerPhone = contract.type === 'private-room-monthly'
    ? company?.companyPhoneNumber
    : member?.phoneNumber

  const subtotal = period.amount
  const tax = subtotal * (invoiceData.taxRate / 100)
  const total = subtotal + tax - invoiceData.discount

  const handleSaveBranding = () => {
    localStorage.setItem('invoice-branding', JSON.stringify(branding))
    alert('Branding settings saved!')
  }

  const handleGeneratePDF = async () => {
    if (!invoiceRef.current) return

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgScaledWidth = imgWidth * ratio
      const imgScaledHeight = imgHeight * ratio
      const xOffset = (pdfWidth - imgScaledWidth) / 2
      const yOffset = 0

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgScaledWidth, imgScaledHeight)
      
      // If content is taller than one page, add additional pages
      let heightLeft = imgScaledHeight
      let position = 0

      while (heightLeft >= pdfHeight) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', xOffset, position, imgScaledWidth, imgScaledHeight)
        heightLeft -= pdfHeight
      }

      const fileName = `${invoiceData.invoiceNumber}-${customerName.replace(/\s+/g, '-')}.pdf`
      pdf.save(fileName)

      // Mark invoice as sent
      if (onSave) {
        onSave({
          invoiceNumber: invoiceData.invoiceNumber,
          date: invoiceData.date,
          dueDate: invoiceData.dueDate,
          customerName,
          customerEmail,
          customerPhone,
          items: [{
            description: `${contract.type === 'private-room-monthly' ? 'Private Room Monthly' : 'Private Desk Monthly'} - ${period.periodName}`,
            quantity: 1,
            unitPrice: period.amount,
            total: period.amount
          }],
          subtotal,
          tax,
          taxRate: invoiceData.taxRate,
          discount: invoiceData.discount,
          total,
          status: 'sent',
          notes: invoiceData.notes,
          branchId: contract.branchId
        })
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%', maxHeight: '95vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="modal-title">Generate Invoice - {period.periodName}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', padding: '24px' }}>
          {/* Settings Panel */}
          <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1e293b' }}>
              Invoice Settings
            </h3>

            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input
                type="text"
                className="form-input"
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Date</label>
              <input
                type="date"
                className="form-input"
                value={invoiceData.date}
                onChange={(e) => setInvoiceData({ ...invoiceData, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={invoiceData.dueDate}
                onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tax Rate (%)</label>
              <input
                type="number"
                className="form-input"
                value={invoiceData.taxRate}
                onChange={(e) => setInvoiceData({ ...invoiceData, taxRate: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discount (EGP)</label>
              <input
                type="number"
                className="form-input"
                value={invoiceData.discount}
                onChange={(e) => setInvoiceData({ ...invoiceData, discount: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input"
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: '32px', marginBottom: '20px', color: '#1e293b' }}>
              Branding Settings
            </h3>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                value={branding.companyName}
                onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Address</label>
              <textarea
                className="form-input"
                value={branding.companyAddress}
                onChange={(e) => setBranding({ ...branding, companyAddress: e.target.value })}
                rows={2}
                placeholder="Street, City, Country"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Phone</label>
              <input
                type="text"
                className="form-input"
                value={branding.companyPhone}
                onChange={(e) => setBranding({ ...branding, companyPhone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Email</label>
              <input
                type="email"
                className="form-input"
                value={branding.companyEmail}
                onChange={(e) => setBranding({ ...branding, companyEmail: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tax ID (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={branding.companyTaxId || ''}
                onChange={(e) => setBranding({ ...branding, companyTaxId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input
                type="text"
                className="form-input"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="/logo.png"
              />
              <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Path to logo file (e.g., /logo.png). Place your logo file in the public folder.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  style={{ width: '50px', height: '38px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Secondary Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  style={{ width: '50px', height: '38px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Footer Text</label>
              <textarea
                className="form-input"
                value={branding.footerText}
                onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                rows={2}
              />
            </div>

            <button
              className="button button-secondary"
              onClick={handleSaveBranding}
              style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={16} />
              Save Branding
            </button>
          </div>

          {/* Invoice Preview */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="button button-primary"
                onClick={handleGeneratePDF}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={16} />
                Generate PDF
              </button>
            </div>

            <div
              ref={invoiceRef}
              style={{
                backgroundColor: 'white',
                padding: '60px',
                minHeight: '800px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                color: '#1e293b',
                lineHeight: '1.6'
              }}
            >
              {/* Top Section: Logo and Company Info Side by Side */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '50px', paddingBottom: '30px', borderBottom: `2px solid #e2e8f0` }}>
                {/* Left: Logo and Company */}
                <div style={{ flex: '0 0 50%' }}>
                  {branding.logoUrl && (
                    <div style={{ marginBottom: '20px' }}>
                      <img
                        src={branding.logoUrl}
                        alt="Logo"
                        style={{ 
                          height: '80px', 
                          width: 'auto',
                          maxWidth: '250px',
                          objectFit: 'contain',
                          display: 'block'
                        }}
                        onError={(e) => {
                          console.error('Logo failed to load:', branding.logoUrl)
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <h1 style={{ 
                      fontSize: '24px', 
                      fontWeight: '700', 
                      color: branding.primaryColor, 
                      margin: '0 0 8px 0',
                      letterSpacing: '-0.5px'
                    }}>
                      {branding.companyName}
                    </h1>
                    {branch && (
                      <p style={{ 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#64748b', 
                        margin: '0 0 12px 0'
                      }}>
                        {branch.name}
                      </p>
                    )}
                    {branding.companyAddress && (
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0', lineHeight: '1.7' }}>
                        {branding.companyAddress}
                      </p>
                    )}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {branding.companyPhone && (
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                          <span style={{ fontWeight: '500' }}>Phone:</span> {branding.companyPhone}
                        </p>
                      )}
                      {branding.companyEmail && (
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                          <span style={{ fontWeight: '500' }}>Email:</span> {branding.companyEmail}
                        </p>
                      )}
                      {branding.companyTaxId && (
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                          <span style={{ fontWeight: '500' }}>Tax ID:</span> {branding.companyTaxId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Invoice Header */}
                <div style={{ flex: '0 0 45%', textAlign: 'right' }}>
                  <h2 style={{ 
                    fontSize: '42px', 
                    fontWeight: '800', 
                    color: branding.primaryColor, 
                    margin: '0 0 30px 0', 
                    letterSpacing: '-1px',
                    lineHeight: '1'
                  }}>
                    INVOICE
                  </h2>
                  <div style={{ display: 'inline-block', textAlign: 'left' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Invoice Number
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: branding.secondaryColor, margin: 0 }}>
                        {invoiceData.invoiceNumber}
                      </p>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0', fontWeight: '600' }}>
                        Invoice Date
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', margin: 0 }}>
                        {new Date(invoiceData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    {invoiceData.dueDate && (
                      <div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0', fontWeight: '600' }}>
                          Due Date
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', margin: 0 }}>
                          {new Date(invoiceData.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bill To and Service Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginBottom: '50px' }}>
                <div>
                  <h3 style={{ 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: '#94a3b8', 
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Bill To
                  </h3>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 10px 0', color: '#1e293b' }}>
                      {customerName}
                    </p>
                    {customerEmail && (
                      <p style={{ fontSize: '14px', margin: '6px 0', color: '#64748b', lineHeight: '1.6' }}>
                        {customerEmail}
                      </p>
                    )}
                    {customerPhone && (
                      <p style={{ fontSize: '14px', margin: '6px 0', color: '#64748b', lineHeight: '1.6' }}>
                        {customerPhone}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 style={{ 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: '#94a3b8', 
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Service Details
                  </h3>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 10px 0', color: '#1e293b' }}>
                      {period.periodName}
                    </p>
                    <p style={{ fontSize: '14px', margin: '6px 0', color: '#64748b', lineHeight: '1.6' }}>
                      {contract.type === 'private-room-monthly' ? 'Private Room Monthly' : 'Private Desk Monthly'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: '50px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'left', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        borderTop: `2px solid ${branding.primaryColor}`,
                        borderBottom: `1px solid #e2e8f0`
                      }}>
                        Description
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'center', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        borderTop: `2px solid ${branding.primaryColor}`,
                        borderBottom: `1px solid #e2e8f0`
                      }}>
                        Qty
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'right', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        borderTop: `2px solid ${branding.primaryColor}`,
                        borderBottom: `1px solid #e2e8f0`
                      }}>
                        Unit Price
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'right', 
                        fontSize: '11px', 
                        fontWeight: '600',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        borderTop: `2px solid ${branding.primaryColor}`,
                        borderBottom: `1px solid #e2e8f0`
                      }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ 
                        padding: '20px', 
                        fontSize: '15px', 
                        color: '#1e293b',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid #e2e8f0',
                        fontWeight: '500'
                      }}>
                        {contract.type === 'private-room-monthly' ? 'Private Room Monthly' : 'Private Desk Monthly'} - {period.periodName}
                      </td>
                      <td style={{ 
                        padding: '20px', 
                        textAlign: 'center', 
                        fontSize: '15px', 
                        color: '#64748b',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        1
                      </td>
                      <td style={{ 
                        padding: '20px', 
                        textAlign: 'right', 
                        fontSize: '15px', 
                        color: '#64748b',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        {period.amount.toFixed(2)} EGP
                      </td>
                      <td style={{ 
                        padding: '20px', 
                        textAlign: 'right', 
                        fontSize: '15px', 
                        fontWeight: '600', 
                        color: '#1e293b',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        {period.amount.toFixed(2)} EGP
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
                <div style={{ width: '350px' }}>
                  <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '24px', 
                    borderRadius: '8px',
                    border: `1px solid #e2e8f0`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Subtotal</span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{subtotal.toFixed(2)} EGP</span>
                    </div>
                    {invoiceData.taxRate > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                          Tax ({invoiceData.taxRate}%)
                        </span>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>{tax.toFixed(2)} EGP</span>
                      </div>
                    )}
                    {invoiceData.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Discount</span>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#dc2626' }}>-{invoiceData.discount.toFixed(2)} EGP</span>
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      paddingTop: '16px',
                      marginTop: '12px',
                      borderTop: `2px solid ${branding.primaryColor}`
                    }}>
                      <span style={{ fontSize: '18px', fontWeight: '700', color: branding.secondaryColor }}>
                        Total
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: '700', color: branding.secondaryColor }}>
                        {total.toFixed(2)} EGP
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoiceData.notes && (
                <div style={{ 
                  marginBottom: '50px', 
                  padding: '20px 24px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '8px',
                  borderLeft: `3px solid ${branding.primaryColor}`
                }}>
                  <h4 style={{ 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: '#94a3b8', 
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Notes
                  </h4>
                  <p style={{ fontSize: '14px', color: '#475569', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
                    {invoiceData.notes}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div style={{ 
                marginTop: '60px', 
                paddingTop: '30px', 
                borderTop: '1px solid #e2e8f0', 
                textAlign: 'center' 
              }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  {branding.footerText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

