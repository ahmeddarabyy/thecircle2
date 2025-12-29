export interface CSVRow {
  'Deal Id': string
  'Deal Owner.id': string
  'Deal Owner': string
  'Deal Name': string
  'Company Name.id': string
  'Company Name': string
  'Contact Name.id': string
  'Contact Name': string
  'Sub-Pipeline': string
  'Amount': string
  'Stage': string
  'Closing Date': string
  'Description': string
  'Created By.id': string
  'Created By': string
  'Modified By.id': string
  'Modified By': string
  'Created Time': string
  'Modified Time': string
  'Last Activity Time': string
  'Pipeline.id': string
  'Pipeline': string
}

export interface ParsedContact {
  contactId: string
  contactName: string
  dealCount: number
  totalAmount: number
  lastDealDate: string
  services: string[]
  paymentMethods: string[]
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim())
  
  // Parse rows
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue
    
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row as CSVRow)
  }
  
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}

export function extractUniqueContacts(rows: CSVRow[]): Map<string, ParsedContact> {
  const contactsMap = new Map<string, ParsedContact>()
  
  rows.forEach(row => {
    const contactId = row['Contact Name.id']
    const contactName = row['Contact Name']
    
    if (!contactId || !contactName) return
    
    if (!contactsMap.has(contactId)) {
      contactsMap.set(contactId, {
        contactId,
        contactName,
        dealCount: 0,
        totalAmount: 0,
        lastDealDate: '',
        services: [],
        paymentMethods: []
      })
    }
    
    const contact = contactsMap.get(contactId)!
    contact.dealCount++
    
    const amount = parseFloat(row['Amount']) || 0
    contact.totalAmount += amount
    
    const dealDate = row['Closing Date']
    if (dealDate && (!contact.lastDealDate || dealDate > contact.lastDealDate)) {
      contact.lastDealDate = dealDate
    }
    
    const service = row['Deal Name']
    if (service && !contact.services.includes(service)) {
      contact.services.push(service)
    }
    
    const paymentMethod = row['Description']
    if (paymentMethod && !contact.paymentMethods.includes(paymentMethod)) {
      contact.paymentMethods.push(paymentMethod)
    }
  })
  
  return contactsMap
}

