import { useState, useEffect } from 'react'
import { Contract, Branch, Company, Member, Room } from '../types'
import { generateContractPeriods } from '../utils/storage'
import CompanyForm from './CompanyForm'

interface ContractFormProps {
  contract?: Contract | null
  initialType?: 'private-room-monthly' | 'private-desk' | null
  branches: Branch[]
  companies: Company[]
  members: Member[]
  rooms: Room[]
  selectedBranchId: string | null
  onSave: (contract: Contract) => void
  onCancel: () => void
  onCreateCompany?: (company: Company) => void
}

export default function ContractForm({ 
  contract, 
  initialType,
  branches, 
  companies, 
  members, 
  rooms,
  selectedBranchId, 
  onSave, 
  onCancel,
  onCreateCompany
}: ContractFormProps) {
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPreview, setPdfPreview] = useState<string | null>(contract?.pdfData || null)
  const [pdfFileName, setPdfFileName] = useState<string>(contract?.pdfFileName || '')

  // Calculate lease duration from existing contract dates
  const calculateLeaseDuration = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) return 'custom'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    
    // Check if it matches common durations (within 1 day tolerance)
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const expectedDays1Month = 30
    const expectedDays3Months = 90
    const expectedDays6Months = 180
    const expectedDays12Months = 365
    
    if (Math.abs(daysDiff - expectedDays1Month) <= 2) return '1'
    if (Math.abs(daysDiff - expectedDays3Months) <= 2) return '3'
    if (Math.abs(daysDiff - expectedDays6Months) <= 2) return '6'
    if (Math.abs(daysDiff - expectedDays12Months) <= 5) return '12'
    return 'custom'
  }

  // Calculate end date based on start date and lease duration
  const calculateEndDate = (startDate: string, duration: string): string => {
    if (!startDate || duration === 'custom') return ''
    
    const start = new Date(startDate)
    const months = parseInt(duration)
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)
    // Subtract 1 day to get the last day of the month before
    end.setDate(end.getDate() - 1)
    
    return end.toISOString().split('T')[0]
  }

  // Initialize values
  const initialStartDate = contract?.startDate || new Date().toISOString().split('T')[0]
  const initialDuration = contract?.startDate && contract?.endDate 
    ? calculateLeaseDuration(contract.startDate, contract.endDate)
    : '6'
  
  // Initialize end date based on start date and default duration
  const getInitialEndDate = (startDate: string, duration: string): string => {
    if (contract?.endDate) return contract.endDate
    if (!startDate || duration === 'custom') return ''
    return calculateEndDate(startDate, duration)
  }

  const [leaseDuration, setLeaseDuration] = useState<string>(initialDuration)

  const [formData, setFormData] = useState({
    type: contract?.type || initialType || 'private-desk' as 'private-room-monthly' | 'private-desk',
    companyId: contract?.companyId || '',
    memberId: contract?.memberId || '',
    startDate: initialStartDate,
    endDate: getInitialEndDate(initialStartDate, initialDuration),
    monthlyFee: contract?.monthlyFee || 0,
    status: contract?.status || 'active' as 'active' | 'expired' | 'cancelled',
    roomId: contract?.roomId || '',
    autoRenew: contract?.autoRenew !== undefined ? contract.autoRenew : true,
    paymentMethod: contract?.paymentMethod || 'cash' as 'cash' | 'card' | 'bank_transfer' | 'other',
    notes: contract?.notes || '',
    selectedBranchId: contract?.branchId || selectedBranchId || ''
  })

  // Update end date when start date or duration changes
  useEffect(() => {
    if (formData.startDate && leaseDuration !== 'custom') {
      const calculatedEndDate = calculateEndDate(formData.startDate, leaseDuration)
      if (calculatedEndDate && calculatedEndDate !== formData.endDate) {
        setFormData(prev => ({ ...prev, endDate: calculatedEndDate }))
      }
    }
  }, [formData.startDate, leaseDuration])

  useEffect(() => {
    if (contract) {
      const duration = contract.startDate && contract.endDate 
        ? calculateLeaseDuration(contract.startDate, contract.endDate)
        : '6'
      setLeaseDuration(duration)
      
      setFormData({
        type: contract.type,
        companyId: contract.companyId || '',
        memberId: contract.memberId || '',
        startDate: contract.startDate,
        endDate: contract.endDate || '',
        monthlyFee: contract.monthlyFee,
        status: contract.status,
        roomId: contract.roomId || '',
        autoRenew: contract.autoRenew,
        paymentMethod: contract.paymentMethod,
        notes: contract.notes || '',
        selectedBranchId: contract.branchId
      })
      setPdfPreview(contract.pdfData || null)
      setPdfFileName(contract.pdfFileName || '')
    }
  }, [contract, selectedBranchId])

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('PDF file size must be less than 10MB')
      return
    }

    setPdfFile(file)
    setPdfFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setPdfPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePdf = () => {
    setPdfFile(null)
    setPdfPreview(null)
    setPdfFileName('')
  }

  const handleCompanyCreated = (company: Company) => {
    if (onCreateCompany) {
      onCreateCompany(company)
    }
    setFormData({ ...formData, companyId: company.id })
    setShowCompanyForm(false)
  }

  // Filter rooms by selected branch
  const availableRooms = rooms.filter(r => r.branchId === formData.selectedBranchId)

  // Filter members (only individual members, not company members)
  const individualMembers = members.filter(m => !m.companyId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== FORM SUBMIT ===')
    console.log('formData.selectedBranchId:', formData.selectedBranchId)
    console.log('selectedBranchId prop:', selectedBranchId)
    
    // Use formData.selectedBranchId, but fallback to prop if form field is empty
    const finalBranchId = formData.selectedBranchId || selectedBranchId
    
    if (!finalBranchId) {
      alert('Please select a branch')
      return
    }
    
    console.log('Final branchId to use:', finalBranchId)

    if (formData.type === 'private-room-monthly' && !formData.companyId) {
      alert('Please select a company for private room contract')
      return
    }

    if (formData.type === 'private-desk' && !formData.memberId) {
      alert('Please select a member for private desk contract')
      return
    }

    if (formData.type === 'private-room-monthly' && !formData.roomId) {
      alert('Please select a room for private room contract')
      return
    }

    if (formData.monthlyFee <= 0) {
      alert('Please enter a valid monthly fee greater than 0')
      return
    }

    if (!formData.endDate) {
      alert('End date is required')
      return
    }

    if (formData.endDate < formData.startDate) {
      alert('End date must be after start date')
      return
    }

    // Handle PDF upload
    let finalPdfData = pdfPreview
    let finalPdfFileName = pdfFileName

    if (pdfFile && !pdfPreview) {
      // If we have a new file but no preview yet, read it
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        finalPdfData = base64
        finalPdfFileName = pdfFile.name
        
        const newContract: Contract = {
          id: contract?.id || `contract-${Date.now()}`,
          type: formData.type,
          companyId: formData.type === 'private-room-monthly' ? formData.companyId : undefined,
          memberId: formData.type === 'private-desk' ? formData.memberId : undefined,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          monthlyFee: formData.monthlyFee,
          status: formData.status,
          roomId: formData.type === 'private-room-monthly' ? formData.roomId : undefined,
          autoRenew: formData.autoRenew,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes.trim() || undefined,
          branchId: finalBranchId,
          createdAt: contract?.createdAt || new Date().toISOString(),
          cancelledDate: formData.status === 'cancelled' && !contract?.cancelledDate 
            ? new Date().toISOString() 
            : contract?.cancelledDate,
          pdfData: finalPdfData || undefined,
          pdfFileName: finalPdfFileName || undefined
        }
        console.log('Contract being saved with branchId:', finalBranchId)
        onSave(newContract)
      }
      reader.readAsDataURL(pdfFile)
      return
    }

    const newContract: Contract = {
      id: contract?.id || `contract-${Date.now()}`,
      type: formData.type,
      companyId: formData.type === 'private-room-monthly' ? formData.companyId : undefined,
      memberId: formData.type === 'private-desk' ? formData.memberId : undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      monthlyFee: formData.monthlyFee,
      status: formData.status,
      roomId: formData.type === 'private-room-monthly' ? formData.roomId : undefined,
      autoRenew: formData.autoRenew,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim() || undefined,
      branchId: finalBranchId,
      createdAt: contract?.createdAt || new Date().toISOString(),
      cancelledDate: formData.status === 'cancelled' && !contract?.cancelledDate 
        ? new Date().toISOString() 
        : contract?.cancelledDate,
      pdfData: finalPdfData || undefined,
      pdfFileName: finalPdfFileName || undefined
    }

    console.log('Contract being saved:', newContract)
    console.log('Contract branchId:', newContract.branchId)
    
    // Generate periods for new contracts (will be created after contract is saved)
    if (!contract) {
      const periods = generateContractPeriods(newContract)
      console.log(`Generated ${periods.length} contract periods`)
      // Store periods to be created after contract save
      ;(newContract as any).__periodsToCreate = periods
    }
    
    onSave(newContract)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{contract ? 'Edit Contract' : 'Add Contract'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="contract-type" className="form-label">Contract Type *</label>
            <select
              id="contract-type"
              name="contract-type"
              className="form-select"
              value={formData.type}
              onChange={(e) => {
                const newType = e.target.value as 'private-room-monthly' | 'private-desk'
                setFormData({ 
                  ...formData, 
                  type: newType,
                  companyId: newType === 'private-room-monthly' ? formData.companyId : '',
                  memberId: newType === 'private-desk' ? formData.memberId : '',
                  roomId: newType === 'private-room-monthly' ? formData.roomId : ''
                })
              }}
              required
            >
              <option value="private-room-monthly">Private Room Monthly (Company)</option>
              <option value="private-desk">Private Desk (Individual Member)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="contract-branch" className="form-label">Branch *</label>
            <select
              id="contract-branch"
              name="contract-branch"
              className="form-select"
              value={formData.selectedBranchId}
              onChange={(e) => setFormData({ ...formData, selectedBranchId: e.target.value, roomId: '' })}
              required
            >
              <option value="">Select a branch...</option>
              {branches.filter(b => b.isActive).map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {formData.type === 'private-room-monthly' && (
            <>
              <div className="form-group">
                <label htmlFor="contract-company" className="form-label">Company *</label>
                <select
                  id="contract-company"
                  name="contract-company"
                  className="form-select"
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  required
                >
                  <option value="">Select a company...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="contract-room" className="form-label">Room *</label>
                <select
                  id="contract-room"
                  name="contract-room"
                  className="form-select"
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  required
                  disabled={!formData.selectedBranchId}
                >
                  <option value="">Select a room...</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'})
                    </option>
                  ))}
                </select>
                {!formData.selectedBranchId && (
                  <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Please select a branch first
                  </small>
                )}
              </div>
            </>
          )}

          {formData.type === 'private-desk' && (
            <div className="form-group">
              <label htmlFor="contract-member" className="form-label">Member *</label>
              <select
                id="contract-member"
                name="contract-member"
                className="form-select"
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                required
              >
                <option value="">Select a member...</option>
                {individualMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="contract-start-date" className="form-label">Start Date *</label>
            <input
              id="contract-start-date"
              name="contract-start-date"
              type="date"
              className="form-input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Lease Duration *</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
              gap: '12px',
              marginTop: '8px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: leaseDuration === '1' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: leaseDuration === '1' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="lease-duration"
                  value="1"
                  checked={leaseDuration === '1'}
                  onChange={(e) => setLeaseDuration(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontWeight: leaseDuration === '1' ? '600' : '400' }}>1 Month</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: leaseDuration === '3' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: leaseDuration === '3' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="lease-duration"
                  value="3"
                  checked={leaseDuration === '3'}
                  onChange={(e) => setLeaseDuration(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontWeight: leaseDuration === '3' ? '600' : '400' }}>3 Months</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: leaseDuration === '6' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: leaseDuration === '6' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="lease-duration"
                  value="6"
                  checked={leaseDuration === '6'}
                  onChange={(e) => setLeaseDuration(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontWeight: leaseDuration === '6' ? '600' : '400' }}>6 Months</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: leaseDuration === '12' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: leaseDuration === '12' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="lease-duration"
                  value="12"
                  checked={leaseDuration === '12'}
                  onChange={(e) => setLeaseDuration(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontWeight: leaseDuration === '12' ? '600' : '400' }}>12 Months</span>
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: leaseDuration === 'custom' ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: leaseDuration === 'custom' ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="lease-duration"
                  value="custom"
                  checked={leaseDuration === 'custom'}
                  onChange={(e) => setLeaseDuration(e.target.value)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontWeight: leaseDuration === 'custom' ? '600' : '400' }}>Custom</span>
              </label>
            </div>
            
            {leaseDuration === 'custom' && (
              <div style={{ marginTop: '12px' }}>
                <label htmlFor="contract-end-date" className="form-label" style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                  End Date *
                </label>
                <input
                  id="contract-end-date"
                  name="contract-end-date"
                  type="date"
                  className="form-input"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                  required={leaseDuration === 'custom'}
                  style={{ maxWidth: '300px' }}
                />
              </div>
            )}
            
            {leaseDuration !== 'custom' && formData.endDate && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '6px',
                border: '1px solid #bae6fd'
              }}>
                <div style={{ fontSize: '14px', color: '#0369a1', fontWeight: '500' }}>
                  End Date: {new Date(formData.endDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  Monthly periods will be automatically generated for this date range.
                </small>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="contract-monthly-fee" className="form-label">Monthly Fee (EGP) *</label>
            <input
              id="contract-monthly-fee"
              name="contract-monthly-fee"
              type="number"
              className="form-input"
              value={formData.monthlyFee || ''}
              onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="contract-status" className="form-label">Status *</label>
              <select
                id="contract-status"
                name="contract-status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                required
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contract-payment-method" className="form-label">Payment Method *</label>
              <select
                id="contract-payment-method"
                name="contract-payment-method"
                className="form-select"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                required
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.autoRenew}
                onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              <span>Auto-renew contract</span>
            </label>
            <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Contract will automatically renew at the end of the term
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Contract PDF (Optional)</label>
            {pdfPreview ? (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#f8fafc', 
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1e293b', marginBottom: '4px' }}>
                      📄 {pdfFileName || 'Contract PDF'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      PDF uploaded
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={pdfPreview}
                      download={pdfFileName || 'contract.pdf'}
                      className="button button-secondary"
                      style={{ padding: '4px 12px', fontSize: '12px', textDecoration: 'none' }}
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={handleRemovePdf}
                      style={{ 
                        padding: '4px 12px', 
                        fontSize: '12px',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        borderColor: '#dc2626'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <input
                  id="contract-pdf"
                  name="contract-pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  style={{ 
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Upload contract PDF document (max 10MB)
                </small>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="contract-notes" className="form-label">Notes (Optional)</label>
            <textarea
              id="contract-notes"
              name="contract-notes"
              className="form-input"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this contract"
              rows={3}
            />
          </div>

          {showCompanyForm && onCreateCompany && (
            <CompanyForm
              company={null}
              members={members}
              onSave={handleCompanyCreated}
              onCancel={() => setShowCompanyForm(false)}
            />
          )}

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {contract ? 'Update Contract' : 'Add Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

