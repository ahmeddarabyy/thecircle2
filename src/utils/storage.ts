import {
  Member, Company, Service, CheckIn, Room, Branch, InventoryItem, InventoryHistory,
  Expense, Transaction, Invoice, Contract, ContractPeriod, User, Booking, Visit,
  RoomReservation, TransactionItem, VoidedTransaction, OutstandingTransaction,
} from '../types'
import { supabase } from '../lib/supabase'

// --- Users (Auth) ---
export const loadUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('Error loading users:', error)
    return []
  }
  return (data || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    password: u.password,
    role: u.role,
    fullName: u.full_name
  }))
}

export const createUser = async (user: User) => {
  const { error } = await supabase.from('users').insert({
    id: user.id,
    username: user.username,
    password: user.password,
    role: user.role,
    full_name: user.fullName
  })
  if (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export const loadCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem('coworking-space-current-user')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('Error loading current user:', error)
    return null
  }
}

export const saveCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem('coworking-space-current-user', JSON.stringify(user))
  } else {
    localStorage.removeItem('coworking-space-current-user')
  }
}

// --- Branches ---
export const loadBranches = async (): Promise<Branch[]> => {
  const { data, error } = await supabase.from('branches').select('*')
  if (error) {
    console.error('Error loading branches:', error)
    return []
  }
  return (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    phoneNumber: b.phone_number,
    email: b.email,
    isActive: b.is_active
  }))
}

export const createBranch = async (branch: Branch) => {
  const { error } = await supabase.from('branches').insert({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone_number: branch.phoneNumber,
    email: branch.email,
    is_active: branch.isActive
  })
  if (error) console.error('Error creating branch:', error)
}

export const updateBranch = async (branch: Branch) => {
  const { error } = await supabase.from('branches').update({
    name: branch.name,
    address: branch.address,
    phone_number: branch.phoneNumber,
    email: branch.email,
    is_active: branch.isActive
  }).eq('id', branch.id)
  if (error) console.error('Error updating branch:', error)
}

export const deleteBranch = async (id: string) => {
  const { error } = await supabase.from('branches').delete().eq('id', id)
  if (error) console.error('Error deleting branch:', error)
}

// --- Members ---
export const loadMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase.from('members').select('*')
  if (error) {
    console.error('Error loading members:', error)
    return []
  }
  return (data || []).map((m: any) => ({
    id: m.id,
    fullName: m.full_name,
    occupation: m.occupation,
    phoneNumber: m.phone_number,
    email: m.email,
    referralSource: m.referral_source,
    companyId: m.company_id,
    hasActiveContract: m.has_active_contract
  }))
}

export const createMember = async (member: Member) => {
  const { error } = await supabase.from('members').insert({
    id: member.id,
    full_name: member.fullName,
    occupation: member.occupation,
    phone_number: member.phoneNumber,
    email: member.email,
    referral_source: member.referralSource,
    company_id: member.companyId,
    has_active_contract: member.hasActiveContract
  })
  if (error) console.error('Error creating member:', error)
}

export const updateMember = async (member: Member) => {
  const { error } = await supabase.from('members').update({
    full_name: member.fullName,
    occupation: member.occupation,
    phone_number: member.phoneNumber,
    email: member.email,
    referral_source: member.referralSource,
    company_id: member.companyId,
    has_active_contract: member.hasActiveContract
  }).eq('id', member.id)
  if (error) console.error('Error updating member:', error)
}

export const deleteMember = async (id: string) => {
  const { error } = await supabase.from('members').delete().eq('id', id)
  if (error) console.error('Error deleting member:', error)
}

// --- Companies ---
export const loadCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase.from('companies').select('*')
  if (error) {
    console.error('Error loading companies:', error)
    return []
  }
  return (data || []).map((c: any) => ({
    id: c.id,
    companyName: c.name,
    companyEmail: c.contact_email,
    companyPhoneNumber: c.phone,
    pointOfContact: c.point_of_contact,
    employeeIds: c.employee_ids || [],
    hasActiveContract: c.has_active_contract
  }))
}

export const createCompany = async (company: Company) => {
  const { error } = await supabase.from('companies').insert({
    id: company.id,
    name: company.companyName,
    contact_email: company.companyEmail,
    phone: company.companyPhoneNumber,
    point_of_contact: company.pointOfContact,
    employee_ids: company.employeeIds,
    has_active_contract: company.hasActiveContract
  })
  if (error) {
    console.error('Error creating company:', error)
    alert(`Failed to save company: ${error.message}`)
  }
}

export const updateCompany = async (company: Company) => {
  const { error } = await supabase.from('companies').update({
    name: company.companyName,
    contact_email: company.companyEmail,
    phone: company.companyPhoneNumber,
    point_of_contact: company.pointOfContact,
    employee_ids: company.employeeIds,
    has_active_contract: company.hasActiveContract,
    updated_at: new Date().toISOString()
  }).eq('id', company.id)
  if (error) console.error('Error updating company:', error)
}

export const deleteCompany = async (id: string) => {
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) console.error('Error deleting company:', error)
}

// --- Services ---
export const loadServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase.from('services').select('*')
  if (error) {
    console.error('Error loading services:', error)
    return []
  }
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    availableForMembers: s.available_for_members,
    availableForCompanies: s.available_for_companies,
    type: s.type,
    branchId: s.branch_id,
    inventoryItemId: s.inventory_item_id,
    inventoryQuantityPerSale: Number(s.inventory_quantity_per_sale || 1)
  }))
}

export const createService = async (service: Service) => {
  const { error } = await supabase.from('services').insert({
    id: service.id,
    name: service.name,
    price: service.price,
    available_for_members: service.availableForMembers,
    available_for_companies: service.availableForCompanies,
    type: service.type,
    branch_id: service.branchId,
    inventory_item_id: service.inventoryItemId,
    inventory_quantity_per_sale: service.inventoryQuantityPerSale
  })
  if (error) console.error('Error creating service:', error)
}

export const updateService = async (service: Service) => {
  const { error } = await supabase.from('services').update({
    name: service.name,
    price: service.price,
    available_for_members: service.availableForMembers,
    available_for_companies: service.availableForCompanies,
    type: service.type,
    branch_id: service.branchId,
    inventory_item_id: service.inventoryItemId,
    inventory_quantity_per_sale: service.inventoryQuantityPerSale
  }).eq('id', service.id)
  if (error) console.error('Error updating service:', error)
}

export const deleteService = async (serviceId: string) => {
  const { error } = await supabase.from('services').delete().eq('id', serviceId)
  if (error) console.error('Error deleting service:', error)
}

// --- Visits (formerly CheckIns) ---
export const loadCheckIns = async (): Promise<CheckIn[]> => {
  const { data, error } = await supabase.from('visits').select('*')
  if (error) {
    console.error('Error loading visits:', error)
    return []
  }
  
  // AUTO-REPAIR: Fix visits with missing visitor info by looking up from related visits
  const visitsWithMissingInfo = (data || []).filter((v: any) => !v.visitor_id || !v.visitor_name)
  if (visitsWithMissingInfo.length > 0) {
    console.warn('=== REPAIRING VISITS WITH MISSING VISITOR INFO ===')
    for (const v of visitsWithMissingInfo) {
      // Check if notes contain "Split from visit" and extract original visit ID
      if (v.notes && v.notes.includes('Split from visit ')) {
        const match = v.notes.match(/Split from visit ([a-zA-Z0-9-]+)/)
        if (match) {
          const originalVisitId = match[1]
          const originalVisit = (data || []).find((ov: any) => ov.id === originalVisitId)
          if (originalVisit && (originalVisit.visitor_id || originalVisit.visitor_name)) {
            console.log(`Repairing visit ${v.id} with info from ${originalVisitId}`)
            // Update the corrupted visit in the database
            const { error: updateError } = await supabase
              .from('visits')
              .update({
                visitor_id: originalVisit.visitor_id,
                visitor_name: originalVisit.visitor_name,
                visitor_type: originalVisit.visitor_type || 'member'
              })
              .eq('id', v.id)
            
            if (updateError) {
              console.error(`Failed to repair visit ${v.id}:`, updateError)
            } else {
              console.log(`Successfully repaired visit ${v.id}`)
              // Update local data too
              v.visitor_id = originalVisit.visitor_id
              v.visitor_name = originalVisit.visitor_name
              v.visitor_type = originalVisit.visitor_type || 'member'
            }
          }
        }
      }
    }
  }
  
  return (data || []).map((v: any) => ({
    id: v.id,
    date: v.date,
    checkInTime: v.check_in_time,
    checkOutTime: v.check_out_time,
    visitorType: v.visitor_type,
    visitorId: v.visitor_id,
    visitorName: v.visitor_name,
    bookingId: v.booking_id,
    branchId: v.branch_id,
    status: v.status,
    paymentStatus: v.payment_status,
    totalAmount: v.total_amount,
    paidAmount: v.paid_amount,
    services: v.services || [],
    inventoryItems: [], // Default empty or map from services if needed
    notes: v.notes,
    createdAt: v.created_at,
    updatedAt: v.updated_at,

    // Legacy mapping for UI compatibility (temporary)
    memberName: v.visitor_name,
    dateTime: v.check_in_time,
    checkedOutDateTime: v.check_out_time,
    totalAmountLegacy: v.total_amount
  }))
}

export const createCheckIn = async (checkIn: CheckIn) => {
  // Map legacy fields to new format if needed
  // Default to 'member' if visitorType is not provided and isCompany is not explicitly true
  const visitorType = checkIn.visitorType || (((checkIn as any).isCompany === true) ? 'company' : 'member')
  const visitorName = checkIn.visitorName || (checkIn as any).memberName || ''
  const visitorId = checkIn.visitorId || (checkIn as any).memberId || undefined
  const dateTimeValue = (checkIn as any).dateTime || checkIn.checkInTime || new Date().toISOString()
  const checkInTime = checkIn.checkInTime || dateTimeValue
  // Extract date from dateTime if date is not provided
  const date = checkIn.date || (dateTimeValue ? new Date(dateTimeValue).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const totalAmount = checkIn.totalAmount || (checkIn as any).totalAmountLegacy || 0
  const paidAmount = checkIn.paidAmount || 0
  const paymentStatus = checkIn.paymentStatus || 'unpaid'
  const status = checkIn.status || 'checked-in'
  
  // Map services format if needed (legacy uses serviceName, new format uses name)
  let services = checkIn.services || []
  if (services.length > 0) {
    const firstService = services[0] as any
    // Convert legacy service format (serviceName) to new format (name)
    if (firstService && 'serviceName' in firstService && !firstService.name) {
      services = services.map((s: any) => ({
        serviceId: s.serviceId,
        name: s.serviceName,
        price: s.price,
        quantity: s.quantity,
        paymentStatus: s.paymentStatus || 'unpaid'
      }))
    }
  }

  const { error } = await supabase.from('visits').insert({
    id: checkIn.id,
    date: date,
    check_in_time: checkInTime,
    check_out_time: checkIn.checkOutTime,
    visitor_type: visitorType,
    visitor_id: visitorId,
    visitor_name: visitorName,
    booking_id: checkIn.bookingId,
    services: services,
    status: status,
    payment_status: paymentStatus,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    branch_id: checkIn.branchId,
    notes: checkIn.notes,
    created_at: checkIn.createdAt || new Date().toISOString()
  })
  if (error) {
    console.error('Error creating visit:', error)
    alert(`Failed to check in: ${error.message}`)
  }
}

export const updateCheckIn = async (checkIn: CheckIn) => {
  // Map legacy fields to new format if needed
  // ALWAYS prioritize the provided visitor info - don't fall back to defaults if they're explicitly provided
  const visitorType = checkIn.visitorType || (((checkIn as any).isCompany === true) ? 'company' : 'member')
  
  // For visitorName and visitorId, use the provided value if it exists (even if empty string)
  // But if undefined/null, try to get from legacy fields
  // This ensures we don't lose visitor info when it's explicitly provided
  let visitorName = checkIn.visitorName
  if (visitorName === undefined || visitorName === null || visitorName === '') {
    visitorName = (checkIn as any).memberName || checkIn.visitorName || ''
  }
  
  let visitorId = checkIn.visitorId
  if (visitorId === undefined || visitorId === null || visitorId === '') {
    visitorId = (checkIn as any).memberId || checkIn.visitorId || undefined
  }
  
  // Debug: Log visitor info to help diagnose "unknown" issue
  if (!visitorName || visitorName === 'Unknown' || !visitorId) {
    console.warn('Visit missing visitor info:', {
      visitId: checkIn.id,
      visitorId: visitorId,
      visitorName: visitorName,
      visitorType: visitorType,
      checkInData: {
        visitorId: checkIn.visitorId,
        visitorName: checkIn.visitorName,
        visitorType: checkIn.visitorType,
        memberId: (checkIn as any).memberId,
        memberName: (checkIn as any).memberName
      }
    })
  }
  const dateTimeValue = (checkIn as any).dateTime || checkIn.checkInTime
  const checkInTime = checkIn.checkInTime || dateTimeValue
  const date = checkIn.date || (dateTimeValue ? new Date(dateTimeValue).toISOString().split('T')[0] : undefined)
  
  // Map services format if needed (legacy uses serviceName, new format uses name)
  let services = checkIn.services || []
  if (services.length > 0) {
    const firstService = services[0] as any
    // Convert legacy service format (serviceName) to new format (name)
    if (firstService && 'serviceName' in firstService && !firstService.name) {
      services = services.map((s: any) => ({
        serviceId: s.serviceId,
        name: s.serviceName,
        price: s.price,
        quantity: s.quantity,
        paymentStatus: s.paymentStatus || 'unpaid'
      }))
    }
  }

  const updateData: any = {
    visitor_type: visitorType,
    booking_id: checkIn.bookingId,
    services: services,
    status: checkIn.status,
    payment_status: checkIn.paymentStatus,
    total_amount: checkIn.totalAmount,
    paid_amount: checkIn.paidAmount,
    branch_id: checkIn.branchId,
    notes: checkIn.notes,
    updated_at: new Date().toISOString(),
    check_out_time: checkIn.checkOutTime || null // Always include check_out_time (null if not set)
  }

  // ALWAYS update visitor_id and visitor_name
  // App.tsx ensures visitor info is preserved when moving from outstanding to checked-out
  updateData.visitor_id = visitorId
  updateData.visitor_name = visitorName

  // Preserve original date and check_in_time to maintain accounting accuracy
  // When moving from outstanding → checked-out, we want revenue attributed to original day
  // Only update date/check_in_time if they're explicitly provided and different
  if (date) updateData.date = date
  if (checkInTime) updateData.check_in_time = checkInTime

  const { error } = await supabase.from('visits').update(updateData).eq('id', checkIn.id)
  if (error) {
    console.error('Error updating visit:', error)
    console.error('Update data:', updateData)
    console.error('CheckIn data:', checkIn)
  } else {
    console.log('Successfully updated visit:', checkIn.id, 'with visitor info:', {
      visitorId: updateData.visitor_id,
      visitorName: updateData.visitor_name,
      visitorType: updateData.visitor_type
    })
  }
}

export const deleteCheckIn = async (id: string) => {
  const { error } = await supabase.from('visits').delete().eq('id', id)
  if (error) console.error('Error deleting visit:', error)
}

// --- NEW V2 RELATIONAL FUNCTIONS ---

// --- NEW: Bookings (Future Reservations) ---
// --- NEW: Bookings (Future Reservations) ---
export const loadBookings = async (): Promise<Booking[]> => {
  const { data, error } = await supabase.from('bookings').select('*')
  if (error) {
    console.error('Error loading bookings:', error)
    return []
  }
  return (data || []).map((b: any) => ({
    id: b.id,
    date: b.date,
    startTime: b.start_time,
    endTime: b.end_time,
    resourceType: b.resource_type,
    resourceId: b.resource_id,
    bookerType: b.booker_type,
    bookerId: b.booker_id,
    bookerName: b.booker_name,
    status: b.status,
    branchId: b.branch_id,
    services: b.services || [],
    notes: b.notes,
    createdAt: b.created_at,
    updatedAt: b.updated_at,

    // Legacy mapping helpers (optional, can remove if UI doesn't need them)
    visitorName: b.booker_name
  }))
}

export const createBooking = async (booking: Booking) => {
  // Map legacy fields to new format if needed
  const bookingAny = booking as any
  
  // Map bookerType and bookerId from legacy memberId/companyId
  const bookerType = booking.bookerType || 
    (bookingAny.companyId ? 'company' : 
     bookingAny.memberId ? 'member' : 'visitor')
  const bookerId = booking.bookerId || bookingAny.memberId || bookingAny.companyId || undefined
  const bookerName = booking.bookerName || bookingAny.visitorName || ''
  
  // Map resourceType and resourceId from legacy roomId
  const resourceType = booking.resourceType || (bookingAny.roomId ? 'room' : 'desk')
  const resourceId = booking.resourceId || bookingAny.roomId || undefined
  
  // Map date, startTime, endTime from legacy expectedStartTime/expectedEndTime
  let date = booking.date
  let startTime = booking.startTime
  let endTime = booking.endTime
  
  if (!date && bookingAny.expectedStartTime) {
    // Extract date from expectedStartTime (ISO timestamp)
    date = new Date(bookingAny.expectedStartTime).toISOString().split('T')[0]
  } else if (!date) {
    date = new Date().toISOString().split('T')[0] // Default to today
  }
  
  if (!startTime && bookingAny.expectedStartTime) {
    // Convert ISO timestamp to "10:00 AM" format
    const startDate = new Date(bookingAny.expectedStartTime)
    const hours = startDate.getHours()
    const minutes = startDate.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    startTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
  } else if (!startTime) {
    startTime = '12:00 PM' // Default
  }
  
  if (!endTime && bookingAny.expectedEndTime) {
    // Convert ISO timestamp to "02:00 PM" format
    const endDate = new Date(bookingAny.expectedEndTime)
    const hours = endDate.getHours()
    const minutes = endDate.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    endTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
  } else if (!endTime) {
    // Default to 1 hour after start time
    const startDate = bookingAny.expectedStartTime ? new Date(bookingAny.expectedStartTime) : new Date()
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    const hours = endDate.getHours()
    const minutes = endDate.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    endTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
  }

  const { error } = await supabase.from('bookings').insert({
    id: booking.id,
    date: date,
    start_time: startTime,
    end_time: endTime,
    resource_type: resourceType,
    resource_id: resourceId,
    booker_type: bookerType,
    booker_id: bookerId,
    booker_name: bookerName,
    status: booking.status || 'confirmed',
    branch_id: booking.branchId,
    services: booking.services || [],
    notes: booking.notes,
    created_at: booking.createdAt || new Date().toISOString()
  })
  if (error) {
    console.error('Error creating booking:', error)
    alert(`Failed to save booking: ${error.message}`)
  }
}

export const updateBooking = async (booking: Booking) => {
  // Map legacy fields to new format if needed
  const bookingAny = booking as any
  
  // Map bookerType and bookerId from legacy memberId/companyId
  const bookerType = booking.bookerType || 
    (bookingAny.companyId ? 'company' : 
     bookingAny.memberId ? 'member' : 'visitor')
  const bookerId = booking.bookerId || bookingAny.memberId || bookingAny.companyId || undefined
  const bookerName = booking.bookerName || bookingAny.visitorName || undefined
  
  // Map resourceType and resourceId from legacy roomId
  const resourceType = booking.resourceType || (bookingAny.roomId ? 'room' : 'desk')
  const resourceId = booking.resourceId || bookingAny.roomId || undefined
  
  // Map date, startTime, endTime from legacy expectedStartTime/expectedEndTime
  let date = booking.date
  let startTime = booking.startTime
  let endTime = booking.endTime
  
  if (!date && bookingAny.expectedStartTime) {
    date = new Date(bookingAny.expectedStartTime).toISOString().split('T')[0]
  }
  
  if (!startTime && bookingAny.expectedStartTime) {
    const startDate = new Date(bookingAny.expectedStartTime)
    const hours = startDate.getHours()
    const minutes = startDate.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    startTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
  }
  
  if (!endTime && bookingAny.expectedEndTime) {
    const endDate = new Date(bookingAny.expectedEndTime)
    const hours = endDate.getHours()
    const minutes = endDate.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    endTime = `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
  }

  const updateData: any = {
    resource_type: resourceType,
    resource_id: resourceId,
    booker_type: bookerType,
    booker_id: bookerId,
    status: booking.status,
    branch_id: booking.branchId,
    services: booking.services,
    notes: booking.notes,
    updated_at: new Date().toISOString()
  }

  // Only include fields if they have values
  if (date) updateData.date = date
  if (startTime) updateData.start_time = startTime
  if (endTime) updateData.end_time = endTime
  if (bookerName) updateData.booker_name = bookerName

  const { error } = await supabase.from('bookings').update(updateData).eq('id', booking.id)
  if (error) console.error('Error updating booking:', error)
}

export const deleteBooking = async (id: string) => {
  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) console.error('Error deleting booking:', error)
}

// Convert Booking to Visit (CheckIn)
export const convertBookingToVisit = async (bookingId: string): Promise<Visit | null> => {
  // Load the booking
  const { data: b, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (bookingError || !b) {
    console.error('Error loading booking for conversion:', bookingError)
    return null
  }

  // Create Visit from Booking
  const visit: Visit = {
    id: `visit-${Date.now()}`,
    date: new Date().toISOString().split('T')[0], // Today
    checkInTime: new Date().toISOString(),
    visitorType: b.booker_type,
    visitorId: b.booker_id,
    visitorName: b.booker_name,
    bookingId: bookingId,
    branchId: b.branch_id,
    status: 'checked-in',
    paymentStatus: 'unpaid',
    totalAmount: 0, // Needs calculation
    paidAmount: 0,
    services: b.services || [],
    notes: b.notes,
    createdAt: new Date().toISOString()
  }

  // Calculate total amount from services? 
  // For now we leave it 0 or calculate on UI, but let's try to sum if prices exist
  const servicesTotal = (visit.services || []).reduce((sum, s) => sum + (s.price * s.quantity), 0)
  visit.totalAmount = servicesTotal

  // Save the visit
  await createCheckIn(visit) // using createCheckIn which maps to Visits table now

  // Update booking status to 'converted_to_visit'
  await supabase
    .from('bookings')
    .update({ status: 'converted_to_visit' })
    .eq('id', bookingId)

  return visit
}

// --- Reporting Fetchers ---

export const getRevenueByBranch = async () => {
  const { data, error } = await supabase
    .from('transaction_items')
    .select('branch_id, branches(name), total_price')

  if (error) return []

  const branchMap: Record<string, { name: string, total: number }> = {}
  data.forEach((ti: any) => {
    const branchName = ti.branches?.name || 'Unknown'
    if (!branchMap[ti.branch_id]) {
      branchMap[ti.branch_id] = { name: branchName, total: 0 }
    }
    branchMap[ti.branch_id].total += Number(ti.total_price)
  })

  return Object.values(branchMap)
}

export const getRevenueByService = async () => {
  // This requires joining with services table or similar
  const { data, error } = await supabase
    .from('transaction_items')
    .select('type, item_id, total_price')

  if (error) return []

  const segmentMap: Record<string, number> = {
    'service': 0,
    'inventory': 0,
    'room': 0
  }

  data.forEach((ti: any) => {
    segmentMap[ti.type] += Number(ti.total_price)
  })

  return [
    { name: 'Services & Passes', value: segmentMap['service'] },
    { name: 'Inventory/F&B', value: segmentMap['inventory'] },
    { name: 'Room Rentals', value: segmentMap['room'] }
  ]
}

// --- Back to Main Entities ---

// --- Rooms ---
export const loadRooms = async (): Promise<Room[]> => {
  const { data, error } = await supabase.from('rooms').select('*')
  if (error) return []
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    branchId: r.branch_id
  }))
}

export const createRoom = async (room: Room) => {
  const { error } = await supabase.from('rooms').insert({
    id: room.id,
    name: room.name,
    capacity: room.capacity,
    branch_id: room.branchId
  })
  if (error) console.error('Error creating room:', error)
}

export const updateRoom = async (room: Room) => {
  const { error } = await supabase.from('rooms').update({
    name: room.name,
    capacity: room.capacity,
    branch_id: room.branchId
  }).eq('id', room.id)
  if (error) console.error('Error updating room:', error)
}

export const deleteRoom = async (id: string) => {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) console.error('Error deleting room:', error)
}

// --- Inventory ---
export const loadInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory_items').select('*').order('name', { ascending: true })
  if (error) return []
  return (data || []).map((i: any) => ({
    id: i.id,
    name: i.name,
    currentStock: Number(i.current_stock || 0),
    unit: i.unit,
    lowStockThreshold: i.low_stock_threshold ? Number(i.low_stock_threshold) : undefined,
    branchId: i.branch_id,
    createdAt: i.created_at,
    updatedAt: i.updated_at
  }))
}

export const createInventoryItem = async (item: InventoryItem) => {
  const { error } = await supabase.from('inventory_items').insert({
    id: item.id,
    name: item.name,
    current_stock: item.currentStock,
    unit: item.unit,
    low_stock_threshold: item.lowStockThreshold,
    branch_id: item.branchId
  })
  if (error) console.error('Error creating inventory item:', error)
}

export const updateInventoryItem = async (item: InventoryItem) => {
  const { error } = await supabase.from('inventory_items').update({
    name: item.name,
    current_stock: item.currentStock,
    unit: item.unit,
    low_stock_threshold: item.lowStockThreshold,
    branch_id: item.branchId,
    updated_at: new Date().toISOString()
  }).eq('id', item.id)
  if (error) console.error('Error updating inventory:', error)
}

export const deleteInventoryItem = async (id: string) => {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id)
  if (error) console.error('Error deleting inventory item:', error)
}

// --- Inventory History ---
export const loadInventoryHistory = async (itemId?: string, branchId?: string): Promise<InventoryHistory[]> => {
  let query = supabase.from('inventory_history').select('*').order('created_at', { ascending: false })
  
  if (itemId) {
    query = query.eq('inventory_item_id', itemId)
  }
  
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  
  const { data, error } = await query.limit(1000) // Limit to recent 1000 records
  if (error) {
    console.error('Error loading inventory history:', error)
    return []
  }
  
  return (data || []).map((h: any) => ({
    id: h.id,
    inventoryItemId: h.inventory_item_id,
    changeType: h.change_type,
    previousStock: Number(h.previous_stock || 0),
    newStock: Number(h.new_stock || 0),
    quantityChanged: Number(h.quantity_changed || 0),
    changedByUserId: h.changed_by_user_id,
    changedByUserName: h.changed_by_user_name,
    reason: h.reason,
    notes: h.notes,
    branchId: h.branch_id,
    createdAt: h.created_at
  }))
}

export const createInventoryHistory = async (history: InventoryHistory) => {
  const { error } = await supabase.from('inventory_history').insert({
    id: history.id,
    inventory_item_id: history.inventoryItemId,
    change_type: history.changeType,
    previous_stock: history.previousStock,
    new_stock: history.newStock,
    quantity_changed: history.quantityChanged,
    changed_by_user_id: history.changedByUserId,
    changed_by_user_name: history.changedByUserName,
    reason: history.reason,
    notes: history.notes,
    branch_id: history.branchId,
    created_at: history.createdAt || new Date().toISOString()
  })
  if (error) {
    console.error('Error creating inventory history:', error)
  }
}

// --- Expenses ---
export const loadExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*')
  if (error) return []
  return (data || []).map((e: any) => ({
    id: e.id,
    date: e.date,
    description: e.description,
    amount: Number(e.amount),
    category: e.category,
    branchId: e.branch_id,
    createdAt: e.created_at
  }))
}

export const createExpense = async (expense: Expense) => {
  const { error } = await supabase.from('expenses').insert({
    id: expense.id,
    date: expense.date,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    branch_id: expense.branchId,
    created_at: expense.createdAt
  })
  if (error) console.error('Error creating expense:', error)
}

export const updateExpense = async (expense: Expense) => {
  const { error } = await supabase.from('expenses').update({
    date: expense.date,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    branch_id: expense.branchId,
    created_at: expense.createdAt
  }).eq('id', expense.id)
  if (error) console.error('Error updating expense:', error)
}

export const deleteExpense = async (id: string) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) console.error('Error deleting expense:', error)
}

// --- Transactions ---
export const loadTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.from('transactions').select('*')
  if (error) return []
  return (data || []).map((t: any) => ({
    id: t.id,
    date: t.date,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    category: t.category,
    paymentMethod: t.payment_method,
    reference: t.reference,
    checkInId: t.check_in_id,
    bookingId: t.booking_id,
    expenseId: t.expense_id,
    contractId: t.contract_id,
    branchId: t.branch_id,
    notes: t.notes,
    createdAt: t.created_at
  }))
}

export const createTransaction = async (t: Transaction) => {
  const { error } = await supabase.from('transactions').insert({
    id: t.id,
    date: t.date,
    type: t.type,
    description: t.description,
    amount: t.amount,
    category: t.category,
    payment_method: t.paymentMethod,
    reference: t.reference,
    check_in_id: t.checkInId,
    booking_id: t.bookingId,
    expense_id: t.expenseId,
    branch_id: t.branchId,
    notes: t.notes,
    created_at: t.createdAt
  })
  if (error) console.error('Error creating transaction:', error)
}

export const updateTransaction = async (t: Transaction) => {
  const { error } = await supabase.from('transactions').update({
    date: t.date,
    type: t.type,
    description: t.description,
    amount: t.amount,
    category: t.category,
    payment_method: t.paymentMethod,
    reference: t.reference,
    check_in_id: t.checkInId,
    booking_id: t.bookingId,
    expense_id: t.expenseId,
    branch_id: t.branchId,
    notes: t.notes
  }).eq('id', t.id)
  if (error) console.error('Error updating transaction:', error)
}

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) console.error('Error deleting transaction:', error)
}

// --- Invoices ---
export const loadInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase.from('invoices').select('*')
  if (error) return []
  return (data || []).map((i: any) => ({
    id: i.id,
    invoiceNumber: i.invoice_number,
    date: i.date,
    dueDate: i.due_date,
    customerName: i.customer_name,
    customerEmail: i.customer_email,
    customerPhone: i.customer_phone,
    customerAddress: i.customer_address,
    items: i.items,
    subtotal: i.subtotal,
    tax: i.tax,
    taxRate: i.tax_rate,
    discount: i.discount,
    total: i.total,
    status: i.status,
    paymentMethod: i.payment_method,
    paidDate: i.paid_date,
    notes: i.notes,
    branchId: i.branch_id,
    transactionId: i.transaction_id,
    createdAt: i.created_at
  }))
}

export const createInvoice = async (i: Invoice) => {
  const { error } = await supabase.from('invoices').insert({
    id: i.id,
    invoice_number: i.invoiceNumber,
    date: i.date,
    due_date: i.dueDate,
    customer_name: i.customerName,
    customer_email: i.customerEmail,
    customer_phone: i.customerPhone,
    customer_address: i.customerAddress,
    items: i.items,
    subtotal: i.subtotal,
    tax: i.tax,
    tax_rate: i.taxRate,
    discount: i.discount,
    total: i.total,
    status: i.status,
    payment_method: i.paymentMethod,
    paid_date: i.paidDate,
    notes: i.notes,
    branch_id: i.branchId,
    transaction_id: i.transactionId,
    created_at: i.createdAt
  })
  if (error) console.error('Error creating invoice:', error)
}

export const updateInvoice = async (i: Invoice) => {
  const { error } = await supabase.from('invoices').update({
    invoice_number: i.invoiceNumber,
    date: i.date,
    due_date: i.dueDate,
    customer_name: i.customerName,
    customer_email: i.customerEmail,
    customer_phone: i.customerPhone,
    customer_address: i.customerAddress,
    items: i.items,
    subtotal: i.subtotal,
    tax: i.tax,
    tax_rate: i.taxRate,
    discount: i.discount,
    total: i.total,
    status: i.status,
    payment_method: i.paymentMethod,
    paid_date: i.paidDate,
    notes: i.notes,
    branch_id: i.branchId,
    transaction_id: i.transactionId,
    created_at: i.createdAt
  }).eq('id', i.id)
  if (error) console.error('Error updating invoice:', error)
}

export const deleteInvoice = async (id: string) => {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) console.error('Error deleting invoice:', error)
}

// --- Contracts ---
export const loadContracts = async (): Promise<Contract[]> => {
  console.log('=== LOAD CONTRACTS ===')
  const { data, error } = await supabase.from('contracts').select('*')
  
  if (error) {
    console.error('❌ ERROR LOADING CONTRACTS:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    
    // If RLS is blocking, show alert
    if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
      alert(`❌ RLS POLICY BLOCKING CONTRACT LOAD!\n\nError: ${error.message}\n\nPlease run fix_contracts_rls.sql in Supabase SQL Editor.`)
    }
    
    return []
  }
  
  console.log('Loaded contracts count:', data?.length || 0)
  console.log('Contract IDs:', data?.map((c: any) => c.id) || [])
  
  return (data || []).map((c: any) => ({
    id: c.id,
    type: c.type,
    companyId: c.company_id,
    memberId: c.member_id,
    startDate: c.start_date,
    endDate: c.end_date,
    monthlyFee: c.monthly_fee,
    status: c.status,
    roomId: c.room_id,
    autoRenew: c.auto_renew,
    paymentMethod: c.payment_method,
    notes: c.notes,
    branchId: c.branch_id,
    createdAt: c.created_at,
    cancelledDate: c.cancelled_date,
    pdfFileName: c.pdf_file_name,
    pdfData: c.pdf_data
  }))
}

// --- Contract Periods ---
export const loadContractPeriods = async (contractId?: string): Promise<ContractPeriod[]> => {
  let query = supabase.from('contract_periods').select('*').order('period_year', { ascending: true }).order('period_month', { ascending: true })
  if (contractId) {
    query = query.eq('contract_id', contractId)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error loading contract periods:', error)
    return []
  }
  return (data || []).map((p: any) => ({
    id: p.id,
    contractId: p.contract_id,
    periodMonth: p.period_month,
    periodYear: p.period_year,
    periodName: p.period_name,
    amount: Number(p.amount),
    paymentStatus: p.payment_status,
    invoiceSent: p.invoice_sent || false,
    paidDate: p.paid_date,
    notes: p.notes,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }))
}

export const createContractPeriod = async (period: ContractPeriod): Promise<ContractPeriod | null> => {
  const { data, error } = await supabase.from('contract_periods').insert({
    id: period.id,
    contract_id: period.contractId,
    period_month: period.periodMonth,
    period_year: period.periodYear,
    period_name: period.periodName,
    amount: period.amount,
    payment_status: period.paymentStatus,
    invoice_sent: period.invoiceSent,
    paid_date: period.paidDate,
    notes: period.notes,
    created_at: period.createdAt,
    updated_at: period.updatedAt
  }).select().single()
  
  if (error) {
    console.error('Error creating contract period:', error)
    return null
  }
  
  return {
    id: data.id,
    contractId: data.contract_id,
    periodMonth: data.period_month,
    periodYear: data.period_year,
    periodName: data.period_name,
    amount: Number(data.amount),
    paymentStatus: data.payment_status,
    invoiceSent: data.invoice_sent,
    paidDate: data.paid_date,
    notes: data.notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export const updateContractPeriod = async (period: ContractPeriod): Promise<void> => {
  const { error } = await supabase.from('contract_periods').update({
    payment_status: period.paymentStatus,
    invoice_sent: period.invoiceSent,
    paid_date: period.paidDate,
    notes: period.notes,
    updated_at: new Date().toISOString()
  }).eq('id', period.id)
  
  if (error) {
    console.error('Error updating contract period:', error)
    throw error
  }
}

// Generate contract periods for a contract based on start and end dates
export const generateContractPeriods = (contract: Contract): ContractPeriod[] => {
  const periods: ContractPeriod[] = []
  const startDate = new Date(contract.startDate)
  const endDate = new Date(contract.endDate)
  
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    const month = currentDate.getMonth() + 1 // 1-12
    const year = currentDate.getFullYear()
    const monthName = currentDate.toLocaleString('default', { month: 'long' })
    const periodName = `${monthName} ${year}`
    
    periods.push({
      id: `period-${contract.id}-${year}-${month}-${Date.now()}-${Math.random()}`,
      contractId: contract.id,
      periodMonth: month,
      periodYear: year,
      periodName,
      amount: contract.monthlyFee,
      paymentStatus: 'unpaid',
      invoiceSent: false,
      createdAt: new Date().toISOString()
    })
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1)
  }
  
  return periods
}

export const createContract = async (c: Contract) => {
  console.log('=== CREATE CONTRACT START ===')
  console.log('Full contract object:', JSON.stringify(c, null, 2))
  
  // Validate required fields
  if (!c.branchId) {
    console.error('Error creating contract: branchId is required')
    throw new Error('Branch ID is required')
  }
  
  if (!c.startDate) {
    console.error('Error creating contract: startDate is required')
    throw new Error('Start date is required')
  }
  
  if (c.type === 'private-desk' && !c.memberId) {
    console.error('Error creating contract: memberId is required for private-desk contracts')
    throw new Error('Member ID is required for private desk contracts')
  }
  
  if (c.type === 'private-room-monthly' && !c.companyId) {
    console.error('Error creating contract: companyId is required for private-room-monthly contracts')
    throw new Error('Company ID is required for private room contracts')
  }

  if (!c.endDate) {
    throw new Error('End date is required for contracts')
  }

  const insertData: any = {
    id: c.id,
    type: c.type,
    start_date: c.startDate,
    end_date: c.endDate, // Now required
    monthly_fee: c.monthlyFee || 0,
    status: c.status || 'active',
    auto_renew: c.autoRenew !== undefined ? c.autoRenew : false,
    payment_method: c.paymentMethod || 'cash',
    branch_id: c.branchId,
    created_at: c.createdAt || new Date().toISOString()
  }

  // Add type-specific required fields
  if (c.type === 'private-room-monthly') {
    if (c.companyId) insertData.company_id = c.companyId
    if (c.roomId) insertData.room_id = c.roomId
  } else if (c.type === 'private-desk') {
    if (c.memberId) {
      insertData.member_id = c.memberId
    } else {
      console.error('MEMBER ID MISSING FOR PRIVATE DESK CONTRACT!')
      throw new Error('Member ID is required for private desk contracts')
    }
  }
  if (c.notes) insertData.notes = c.notes
  if (c.cancelledDate) insertData.cancelled_date = c.cancelledDate
  if (c.pdfFileName) insertData.pdf_file_name = c.pdfFileName
  if (c.pdfData) insertData.pdf_data = c.pdfData

  console.log('=== INSERT DATA PREPARED ===')
  console.log('Insert data:', JSON.stringify(insertData, null, 2))
  console.log('Table: contracts')
  console.log('Supabase client exists:', !!supabase)
  
  try {
    console.log('=== CALLING SUPABASE INSERT ===')
    console.log('Supabase client:', supabase ? 'EXISTS' : 'MISSING')
    console.log('Table name: contracts')
    console.log('Insert payload:', JSON.stringify(insertData, null, 2))
    
    const insertResult = await supabase.from('contracts').insert(insertData).select()
    
    console.log('=== DATABASE RESPONSE ===')
    console.log('Full result object:', insertResult)
    console.log('Data returned:', insertResult.data)
    console.log('Error:', insertResult.error)
    console.log('Error type:', typeof insertResult.error)
    console.log('Error is null?', insertResult.error === null)
    console.log('Error is undefined?', insertResult.error === undefined)
    
    const { data, error } = insertResult
    
    if (error) {
      console.error('=== DATABASE ERROR ===')
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('Full error object:', JSON.stringify(error, null, 2))
      console.error('Contract data attempted:', JSON.stringify(insertData, null, 2))
      
      // Create detailed error message
      let errorMsg = `❌ DATABASE ERROR!\n\n`
      if (error.code) errorMsg += `Code: ${error.code}\n`
      if (error.message) errorMsg += `Message: ${error.message}\n`
      if (error.details) errorMsg += `Details: ${error.details}\n`
      if (error.hint) errorMsg += `Hint: ${error.hint}\n`
      
      // Check for common issues and provide solutions
      if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
        errorMsg += `\n🔒 SOLUTION: Row Level Security (RLS) is blocking inserts.\n\nRun this in Supabase SQL Editor:\n\nCREATE POLICY "Allow all inserts" ON public.contracts FOR INSERT WITH CHECK (true);\n\nOr run fix_contracts_table.sql`
      } else if (error.code === '42P01') {
        errorMsg += `\n🔒 SOLUTION: Table doesn't exist. Run the database schema script.`
      } else if (error.code === '23505') {
        errorMsg += `\n🔒 SOLUTION: Duplicate ID. Try again.`
      } else if (error.code === '23503') {
        errorMsg += `\n🔒 SOLUTION: Invalid foreign key. Check member/company/branch IDs exist.`
      }
      
      // Show alert immediately
      alert(errorMsg)
      
      throw new Error(errorMsg)
    }
    
    if (!data || data.length === 0) {
      console.error('=== NO DATA RETURNED ===')
      console.error('Insert succeeded but no data returned')
      throw new Error('Contract was not created - no data returned from database')
    }
    
    console.log('=== SUCCESS ===')
    console.log('Contract created successfully:', data[0])
    console.log('=== CREATE CONTRACT END ===')
    return data[0]
  } catch (err: any) {
    console.error('=== EXCEPTION CAUGHT ===')
    console.error('Exception:', err)
    console.error('Exception message:', err.message)
    console.error('Exception stack:', err.stack)
    throw err
  }
}

export const updateContract = async (c: Contract) => {
  if (!c.endDate) {
    throw new Error('End date is required for contracts')
  }
  
  const { error } = await supabase.from('contracts').update({
    type: c.type,
    company_id: c.companyId,
    member_id: c.memberId,
    start_date: c.startDate,
    end_date: c.endDate,
    monthly_fee: c.monthlyFee,
    status: c.status,
    room_id: c.roomId,
    auto_renew: c.autoRenew,
    payment_method: c.paymentMethod,
    notes: c.notes,
    branch_id: c.branchId,
    created_at: c.createdAt,
    cancelled_date: c.cancelledDate,
    pdf_file_name: c.pdfFileName,
    pdf_data: c.pdfData
  }).eq('id', c.id)
  if (error) console.error('Error updating contract:', error)
}

export const deleteContract = async (id: string) => {
  const { error } = await supabase.from('contracts').delete().eq('id', id)
  if (error) console.error('Error deleting contract:', error)
}

// --- Transaction Items ---
export const loadTransactionItems = async (): Promise<TransactionItem[]> => {
  const { data, error } = await supabase.from('transaction_items').select('*')
  if (error) return []
  return (data || []).map((ti: any) => ({
    id: ti.id,
    transactionId: ti.transaction_id,
    bookingId: ti.booking_id,
    expenseId: ti.expense_id,
    type: ti.type,
    itemId: ti.item_id,
    quantity: ti.quantity,
    unitPrice: ti.unit_price,
    totalPrice: ti.total_price,
    branchId: ti.branch_id,
    createdAt: ti.created_at
  }))
}

export const createTransactionItem = async (ti: TransactionItem) => {
  const { error } = await supabase.from('transaction_items').insert({
    id: ti.id,
    transaction_id: ti.transactionId,
    booking_id: ti.bookingId,
    expense_id: ti.expenseId,
    type: ti.type,
    item_id: ti.itemId,
    quantity: ti.quantity,
    unit_price: ti.unitPrice,
    total_price: ti.totalPrice,
    branch_id: ti.branchId,
    created_at: ti.createdAt
  })
  if (error) console.error('Error creating transaction item:', error)
}

// --- Room Reservations ---
export const loadRoomReservations = async (): Promise<RoomReservation[]> => {
  const { data, error } = await supabase.from('room_reservations').select('*')
  if (error) return []
  return (data || []).map((rr: any) => ({
    id: rr.id,
    roomId: rr.room_id,
    memberId: rr.member_id,
    companyId: rr.company_id,
    visitorName: rr.visitor_name,
    startTime: rr.start_time,
    endTime: rr.end_time,
    date: rr.date,
    branchId: rr.branch_id,
    status: rr.status,
    notes: rr.notes
  }))
}

export const createRoomReservation = async (rr: RoomReservation) => {
  const { error } = await supabase.from('room_reservations').insert({
    id: rr.id,
    room_id: rr.roomId,
    member_id: rr.memberId,
    company_id: rr.companyId,
    visitor_name: rr.visitorName,
    start_time: rr.startTime,
    end_time: rr.endTime,
    date: rr.date,
    branch_id: rr.branchId,
    status: rr.status,
    notes: rr.notes
  })
  if (error) console.error('Error creating room reservation:', error)
}

// --- Voided Transactions ---
export const loadVoidedTransactions = async (): Promise<VoidedTransaction[]> => {
  const { data, error } = await supabase.from('voided_transactions').select('*')
  if (error) return []
  return (data || []).map((vt: any) => ({
    id: vt.id,
    checkInId: vt.check_in_id,
    transactionId: vt.transaction_id,
    voidedAt: vt.voided_at,
    reason: vt.reason,
    originalTotalAmount: vt.original_total_amount,
    branchId: vt.branch_id
  }))
}

export const createVoidedTransaction = async (vt: VoidedTransaction) => {
  const { error } = await supabase.from('voided_transactions').insert({
    id: vt.id,
    check_in_id: vt.checkInId,
    transaction_id: vt.transactionId,
    voided_at: vt.voidedAt,
    reason: vt.reason,
    original_total_amount: vt.originalTotalAmount,
    branch_id: vt.branchId
  })
  if (error) console.error('Error creating voided transaction:', error)
}

// --- Outstanding Transactions ---
export const loadOutstandingTransactions = async (): Promise<OutstandingTransaction[]> => {
  const { data, error } = await supabase.from('outstanding_transactions').select('*')
  if (error) return []
  return (data || []).map((ot: any) => ({
    id: ot.id,
    checkInId: ot.check_in_id,
    memberId: ot.member_id,
    companyId: ot.company_id,
    totalAmount: ot.total_amount,
    paidAmount: ot.paid_amount,
    dueAmount: ot.due_amount,
    status: ot.status,
    branchId: ot.branch_id,
    createdAt: ot.created_at,
    updatedAt: ot.updated_at
  }))
}

export const createOutstandingTransaction = async (ot: OutstandingTransaction) => {
  const { error } = await supabase.from('outstanding_transactions').insert({
    id: ot.id,
    check_in_id: ot.checkInId,
    member_id: ot.memberId,
    company_id: ot.companyId,
    total_amount: ot.totalAmount,
    paid_amount: ot.paidAmount,
    due_amount: ot.dueAmount,
    status: ot.status,
    branch_id: ot.branchId,
    created_at: ot.createdAt,
    updated_at: ot.updatedAt
  })
  if (error) console.error('Error creating outstanding transaction:', error)
}

export const updateOutstandingTransaction = async (ot: OutstandingTransaction) => {
  const { error } = await supabase.from('outstanding_transactions').update({
    paid_amount: ot.paidAmount,
    due_amount: ot.dueAmount,
    status: ot.status,
    updated_at: new Date().toISOString()
  }).eq('id', ot.id)
  if (error) console.error('Error updating outstanding transaction:', error)
}

// --- Stub functions for backward compatibility ---
export const saveMembers = (_m: Member[]) => { /* handled by direct create/update/delete */ }
export const saveCompanies = (_c: Company[]) => { /* handled by direct create/update/delete */ }
export const saveServices = (_s: Service[]) => { /* handled by direct create/update/delete */ }
export const saveCheckIns = (_c: CheckIn[]) => { /* handled by direct create/update/delete */ }
export const saveRooms = (_r: Room[]) => { /* handled by direct create/update/delete */ }
export const saveBranches = (_b: Branch[]) => { /* handled by direct create/update/delete */ }
export const saveInventory = (_i: InventoryItem[]) => { /* handled by direct create/update/delete */ }
export const saveExpenses = (_e: Expense[]) => { /* handled by direct create/update/delete */ }
export const saveTransactions = (_t: Transaction[]) => { /* handled by direct create/update/delete */ }
export const saveInvoices = (_i: Invoice[]) => { /* handled by direct create/update/delete */ }
export const saveContracts = (_c: Contract[]) => { /* handled by direct create/update/delete */ }

// --- Contract Renewals ---


// Process contract renewals for a given month/year

export const getSelectedBranch = () => localStorage.getItem('coworking-space-selected-branch')
export const setSelectedBranch = (id: string) => localStorage.setItem('coworking-space-selected-branch', id)
