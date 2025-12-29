import { useState } from 'react'
import { Member } from '../types'
import { parseCSV, extractUniqueContacts, ParsedContact } from '../utils/csvParser'

interface ImportContactsProps {
  onImport: (members: Member[]) => void
  onCancel: () => void
}

export default function ImportContacts({ onImport, onCancel }: ImportContactsProps) {
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string
        const rows = parseCSV(csvText)
        const contactsMap = extractUniqueContacts(rows)
        const contactsArray = Array.from(contactsMap.values())
        
        setParsedContacts(contactsArray)
        // Select all by default
        setSelectedContacts(new Set(contactsArray.map(c => c.contactId)))
        setIsProcessing(false)
      } catch (error) {
        console.error('Error parsing CSV:', error)
        alert('Error parsing CSV file. Please check the file format.')
        setIsProcessing(false)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleToggleContact = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(contactId)) {
        newSet.delete(contactId)
      } else {
        newSet.add(contactId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedContacts.size === parsedContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(parsedContacts.map(c => c.contactId)))
    }
  }

  const handleImport = () => {
    const contactsToImport = parsedContacts.filter(c => selectedContacts.has(c.contactId))
    
    const members: Member[] = contactsToImport.map(contact => ({
      id: `member-${contact.contactId}`,
      fullName: contact.contactName,
      occupation: '', // Not available in CSV
      phoneNumber: '', // Not available in CSV
      email: '', // Not available in CSV
      referralSource: 'Imported from CSV',
      companyId: undefined,
      hasActiveContract: false
    }))

    onImport(members)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Import Contacts from CSV</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="form-label">Select CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          {isProcessing && (
            <p style={{ marginTop: '8px', color: '#64748b', fontSize: '14px' }}>
              Processing file...
            </p>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: parsedContacts.length > 0 ? '#eff6ff' : '#f8fafc',
          borderRadius: '8px',
          border: parsedContacts.length > 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
              Total Contacts Found
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
              {parsedContacts.length}
            </div>
            {parsedContacts.length > 0 && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {selectedContacts.size} selected for import
              </div>
            )}
          </div>
          {parsedContacts.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="button button-secondary"
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              {selectedContacts.size === parsedContacts.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {parsedContacts.length > 0 && (
          <>

            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto', 
              border: '1px solid #e2e8f0', 
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedContacts.size === parsedContacts.length && parsedContacts.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Contact Name</th>
                    <th>Deals</th>
                    <th>Total Amount</th>
                    <th>Last Deal</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedContacts.map(contact => (
                    <tr key={contact.contactId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.contactId)}
                          onChange={() => handleToggleContact(contact.contactId)}
                        />
                      </td>
                      <td style={{ fontWeight: '500' }}>{contact.contactName}</td>
                      <td>{contact.dealCount}</td>
                      <td>{contact.totalAmount} EGP</td>
                      <td>{contact.lastDealDate || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ 
              padding: '12px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              <strong>{selectedContacts.size}</strong> contact{selectedContacts.size !== 1 ? 's' : ''} selected for import
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleImport}
            disabled={selectedContacts.size === 0}
          >
            Import {selectedContacts.size} Contact{selectedContacts.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

