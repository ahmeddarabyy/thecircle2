import { useState, useEffect, useMemo } from 'react'
import { CheckIn, Booking, Service, Member, Company, Room } from '../types'
import { X, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface DetailEditModalProps {
  item: CheckIn | Booking | null
  isBooking: boolean
  members: Member[]
  companies: Company[]
  services: Service[]
  rooms: Room[]
  bookings?: Booking[] // For conflict checking
  checkIns?: CheckIn[] // For conflict checking
  onSave: (item: CheckIn | Booking) => void | Promise<void>
  onCreateVisit?: (visit: CheckIn) => Promise<void> // For creating new visits (split functionality)
  onCancel: () => void
}

export default function DetailEditModal({ 
  item, 
  isBooking, 
  members, 
  companies, 
  services, 
  rooms,
  bookings = [],
  checkIns = [],
  onSave, 
  onCreateVisit,
  onCancel 
}: DetailEditModalProps) {
  
  const [isEditing, setIsEditing] = useState(false)
  const [editedItem, setEditedItem] = useState<CheckIn | Booking | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedServices, setSelectedServices] = useState<{ serviceId: string; quantity: number; paymentStatus?: 'paid' | 'unpaid' }[]>([])
  const [bookingDate, setBookingDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [notes, setNotes] = useState('')
  const [voidReason, setVoidReason] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      setEditedItem({ ...item })
      
      if (isBooking) {
        const booking = item as Booking
        setBookingDate(booking.date || '')
        setStartTime(booking.startTime || '')
        setEndTime(booking.endTime || '')
        setSelectedRoomId(booking.resourceType === 'room' ? (booking.resourceId || '') : '')
        setNotes(booking.notes || '')
        
        if (booking.bookerType === 'member' && booking.bookerId) {
          setSelectedMemberId(booking.bookerId)
        } else if (booking.bookerType === 'company' && booking.bookerId) {
          setSelectedCompanyId(booking.bookerId)
        }
        
        setSelectedServices(booking.services?.map(s => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
          paymentStatus: (s as any).paymentStatus || 'unpaid'
        })) || [])
      } else {
        const visit = item as CheckIn
        setNotes(visit.notes || '')
        if (visit.visitorType === 'member' && visit.visitorId) {
          setSelectedMemberId(visit.visitorId)
        } else if (visit.visitorType === 'company' && visit.visitorId) {
          setSelectedCompanyId(visit.visitorId)
        }
        
        setSelectedServices(visit.services?.map(s => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
          paymentStatus: s.paymentStatus || 'unpaid'
        })) || [])
        
        // Load void reason if visit is voided
        if (visit.status === 'voided') {
          loadVoidReason(visit.id)
        } else {
          setVoidReason(null)
        }
      }
    }
  }, [item, isBooking, services])

  const loadVoidReason = async (checkInId: string) => {
    try {
      const { data, error } = await supabase
        .from('voided_transactions')
        .select('reason')
        .eq('check_in_id', checkInId)
        .order('voided_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.error('Error loading void reason:', error)
        setVoidReason(null)
      } else {
        setVoidReason(data?.reason || null)
      }
    } catch (error) {
      console.error('Error loading void reason:', error)
      setVoidReason(null)
    }
  }

  if (!item) return null

  // Convert 12-hour format to 24-hour format for calculations
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h || !time12h.trim()) return ''
    const trimmed = time12h.trim()
    const match = trimmed.match(/(\d+):(\d+)\s+(AM|PM)/i)
    if (!match) return ''

    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    const period = match[3].toUpperCase()

    let hour24 = hours
    if (period === 'PM' && hours !== 12) hour24 = hours + 12
    if (period === 'AM' && hours === 12) hour24 = 0
    return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Check for room booking conflicts - returns conflict details if found
  const checkRoomConflict = (roomId: string, bookingDate: string, startTime24: string, endTime24: string, excludeBookingId?: string): { hasConflict: boolean; conflictDetails?: Array<{ type: 'booking' | 'checkin', name: string, start: string, end: string }> } => {
    if (!roomId || !bookingDate || !startTime24 || !endTime24) {
      return { hasConflict: false }
    }

    const bookingStart = new Date(`${bookingDate}T${startTime24}`)
    const bookingEnd = new Date(`${bookingDate}T${endTime24}`)
    const conflicts: Array<{ type: 'booking' | 'checkin', name: string, start: string, end: string }> = []

    // Check existing bookings (exclude current booking if editing)
    bookings.forEach(booking => {
      if (excludeBookingId && booking.id === excludeBookingId) return
      if (booking.resourceType !== 'room' || booking.resourceId !== roomId) return
      if (booking.date !== bookingDate) return
      if (booking.status !== 'confirmed' && booking.status !== 'no-show') return
      
      if (!booking.startTime || !booking.endTime) return
      
      // Convert booking times to 24-hour format for comparison
      const existingStart24 = convertTo24Hour(booking.startTime)
      const existingEnd24 = convertTo24Hour(booking.endTime)
      
      if (!existingStart24 || !existingEnd24) return
      
      const existingStart = new Date(`${bookingDate}T${existingStart24}`)
      const existingEnd = new Date(`${bookingDate}T${existingEnd24}`)
      
      // Check for overlap: new booking overlaps if it starts before existing ends AND ends after existing starts
      if (bookingStart < existingEnd && bookingEnd > existingStart) {
        conflicts.push({
          type: 'booking',
          name: booking.bookerName || booking.visitorName || 'Unknown',
          start: booking.startTime,
          end: booking.endTime
        })
      }
    })

    // Check existing check-ins for conflicts
    checkIns.forEach(existing => {
      // Only check bookings/check-ins that have the same room
      if (!existing.roomId || existing.roomId !== roomId) return

      // Get the date and time for the existing booking
      const existingDate = existing.date || (existing.checkInTime ? new Date(existing.checkInTime).toISOString().split('T')[0] : '')
      if (!existingDate) return

      // Only check if it's the same date
      if (existingDate !== bookingDate) return

      // Get the time slot for existing booking
      if (!existing.roomBookingStartTime || !existing.roomBookingEndTime) return

      const existingStart = new Date(`${existingDate}T${existing.roomBookingStartTime}`)
      const existingEnd = new Date(`${existingDate}T${existing.roomBookingEndTime}`)

      // Check for overlap: new booking overlaps if it starts before existing ends AND ends after existing starts
      if (bookingStart < existingEnd && bookingEnd > existingStart) {
        // Convert 24-hour format to 12-hour for display
        const convertTo12Hour = (time24: string) => {
          const [h, m] = time24.split(':').map(Number)
          const period = h >= 12 ? 'PM' : 'AM'
          const hour12 = h % 12 || 12
          return `${hour12}:${String(m).padStart(2, '0')} ${period}`
        }
        conflicts.push({
          type: 'checkin',
          name: existing.visitorName || existing.memberName || 'Unknown',
          start: convertTo12Hour(existing.roomBookingStartTime),
          end: convertTo12Hour(existing.roomBookingEndTime)
        })
      }
    })

    return {
      hasConflict: conflicts.length > 0,
      conflictDetails: conflicts.length > 0 ? conflicts : undefined
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => {
      const existing = prev.find(s => s.serviceId === serviceId)
      if (existing) {
        return prev.filter(s => s.serviceId !== serviceId)
      } else {
        return [...prev, { serviceId, quantity: 1 }]
      }
    })
  }

  const handleQuantityChange = (serviceId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedServices(prev =>
      prev.map(s => s.serviceId === serviceId ? { ...s, quantity } : s)
    )
  }

  const handlePaymentStatusToggle = (serviceId: string, autoSave: boolean = false) => {
    setSelectedServices(prev => {
      const updated = prev.map(s => {
        if (s.serviceId === serviceId) {
          const currentStatus = s.paymentStatus || 'unpaid'
          return { ...s, paymentStatus: (currentStatus === 'paid' ? 'unpaid' : 'paid') as 'paid' | 'unpaid' }
        }
        return s
      })
      
      // Auto-save if requested (for view mode)
      if (autoSave && !isBooking && item) {
        setTimeout(() => {
          const updatedServices = updated.map(s => {
            const svc = services.find(svc => svc.id === s.serviceId)
            if (!svc) return s as any
            return {
              serviceId: s.serviceId,
              name: svc.name,
              price: svc.price,
              quantity: s.quantity,
              paymentStatus: s.paymentStatus || 'unpaid'
            }
          })
          
          const totalAmount = updatedServices.reduce((sum, s) => sum + (s.price * s.quantity), 0)
          const paidAmount = updatedServices
            .filter(s => s.paymentStatus === 'paid')
            .reduce((sum, s) => sum + (s.price * s.quantity), 0)
          const paymentStatus = paidAmount === 0 ? 'unpaid' : (paidAmount >= totalAmount ? 'paid' : 'partial')
          
          const updatedItem = {
            ...item,
            services: updatedServices,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            paymentStatus: paymentStatus
          }
          onSave(updatedItem as CheckIn | Booking)
        }, 100)
      }
      
      return updated
    })
  }

  const hasDayOrShiftPass = () => {
    if (!item || isBooking) return false
    const itemServices = item.services || []
    return itemServices.some(s => {
      const name = (s.name || s.name || '').toLowerCase()
      return name.includes('day pass') || name.includes('shift pass')
    })
  }

  const hasHourlyRoomBooking = () => {
    if (!item || !isBooking) return false
    const itemServices = item.services || []
    return itemServices.some(s => {
      const name = (s.name || s.name || '').toLowerCase()
      return name.includes('hourly') || name.includes('private room')
    })
  }

  const calculateHours = (start: string, end: string): number => {
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ')
      const [hours, minutes] = time.split(':').map(Number)
      let hour24 = hours
      if (period === 'PM' && hours !== 12) hour24 += 12
      if (period === 'AM' && hours === 12) hour24 = 0
      return hour24 + minutes / 60
    }
    
    const startHour = parseTime(start)
    const endHour = parseTime(end)
    return Math.max(0, endHour - startHour)
  }

  const getCheckInTime = () => {
    if (!item || isBooking) return null
    const visit = item as CheckIn
    const time = visit.checkInTime || visit.dateTime
    if (!time) return null
    try {
      if (typeof time === 'string') {
        const parsed = new Date(time)
        return isNaN(parsed.getTime()) ? null : parsed
      }
      const dateObj = time as any
      if (dateObj && typeof dateObj.getTime === 'function') {
        return dateObj as Date
      }
    } catch {
      return null
    }
    return null
  }

  const getCheckOutTime = () => {
    if (!item || isBooking) return null
    const visit = item as CheckIn
    const time = visit.checkOutTime
    if (!time) return null
    try {
      if (typeof time === 'string') {
        const parsed = new Date(time)
        return isNaN(parsed.getTime()) ? null : parsed
      }
      const dateObj = time as any
      if (dateObj && typeof dateObj.getTime === 'function') {
        return dateObj as Date
      }
    } catch {
      return null
    }
    return null
  }

  const calculateTotal = () => {
    if (!isEditing) return 0
    
    let total = selectedServices.reduce((sum, selected) => {
      const service = services.find(s => s.id === selected.serviceId)
      if (!service) return sum
      
      const name = service.name.toLowerCase()
      if (name.includes('hourly') || name.includes('private room')) {
        if (isBooking && startTime && endTime) {
          const hours = calculateHours(startTime, endTime)
          const ROOM_HOURLY_RATE = 250
          return sum + (hours * ROOM_HOURLY_RATE * selected.quantity)
        }
      }
      
      return sum + (service.price * selected.quantity)
    }, 0)
    
    return total
  }

  const calculatePaidAmount = () => {
    return selectedServices.reduce((sum, selected) => {
      const service = services.find(s => s.id === selected.serviceId)
      if (!service) return sum
      
      if (selected.paymentStatus !== 'paid') return sum
      
      const name = service.name.toLowerCase()
      if (name.includes('hourly') || name.includes('private room')) {
        if (isBooking && startTime && endTime) {
          const hours = calculateHours(startTime, endTime)
          const ROOM_HOURLY_RATE = 250
          return sum + (hours * ROOM_HOURLY_RATE * selected.quantity)
        }
      }
      
      return sum + (service.price * selected.quantity)
    }, 0)
  }

  const totalAmount = useMemo(() => {
    if (isEditing) {
      return calculateTotal()
    }
    if (isBooking) {
      return (item as Booking).services?.reduce((sum, s) => sum + (s.price * s.quantity), 0) || 0
    }
    return (item as CheckIn).totalAmount || 0
  }, [isEditing, selectedServices, startTime, endTime, isBooking, item, services])

  const handleSplitVisit = async () => {
    if (!item || isBooking) return
    
    const visit = item as CheckIn
    if (!visit.services || visit.services.length === 0) return
    
    // CRITICAL: Ensure we have visitor info - look up from members/companies if missing
    let visitorId = visit.visitorId
    let visitorName = visit.visitorName
    let visitorType = visit.visitorType || 'member'
    
    // If visitorId exists but visitorName is missing, look it up
    if (visitorId && !visitorName) {
      if (visitorType === 'member') {
        const member = members.find(m => m.id === visitorId)
        if (member) visitorName = member.fullName
      } else if (visitorType === 'company') {
        const company = companies.find(c => c.id === visitorId)
        if (company) visitorName = company.companyName
      }
    }
    
    // If visitorName exists but visitorId is missing, try to find the ID
    if (visitorName && !visitorId) {
      if (visitorType === 'member') {
        const member = members.find(m => m.fullName === visitorName)
        if (member) visitorId = member.id
      } else if (visitorType === 'company') {
        const company = companies.find(c => c.companyName === visitorName)
        if (company) visitorId = company.id
      }
    }
    
    // Split services into paid and unpaid
    const paidServices = visit.services.filter(s => s.paymentStatus === 'paid')
    const unpaidServices = visit.services.filter(s => s.paymentStatus !== 'paid')
    
    if (paidServices.length === 0 || unpaidServices.length === 0) {
      alert('Cannot split: All services must be either fully paid or fully unpaid.')
      return
    }
    
    // Calculate amounts for each part
    const paidTotal = paidServices.reduce((sum, s) => sum + (s.price * s.quantity), 0)
    const paidPaidAmount = paidTotal // All paid services are fully paid
    const unpaidTotal = unpaidServices.reduce((sum, s) => sum + (s.price * s.quantity), 0)
    const unpaidPaidAmount = 0 // No payment for unpaid services
    
    // Show service details in confirmation
    const paidServiceNames = paidServices.map(s => `  • ${s.name || s.name} × ${s.quantity}`).join('\n')
    const unpaidServiceNames = unpaidServices.map(s => `  • ${s.name || s.name} × ${s.quantity}`).join('\n')
    
    // Confirm the split
    const confirmMessage = `Split this visit?\n\n` +
      `PAID SERVICES (${paidServices.length}) → Checked Out:\n${paidServiceNames}\nTotal: ${paidTotal.toLocaleString()} EGP\n\n` +
      `UNPAID SERVICES (${unpaidServices.length}) → Outstanding:\n${unpaidServiceNames}\nTotal: ${unpaidTotal.toLocaleString()} EGP\n\n` +
      `Both visits will maintain the original date (${visit.date}) for accounting purposes.`
    
    if (!confirm(confirmMessage)) return
    
    // Create new visit for unpaid services (outstanding)
    // Use the recovered visitor info (not the potentially missing visit.* values)
    const outstandingVisit: CheckIn = {
      id: `visit-${Date.now()}-outstanding`,
      date: visit.date, // Preserve original date for accounting
      checkInTime: visit.checkInTime, // Preserve original check-in time
      checkOutTime: undefined, // No check-out for outstanding
      visitorType: visitorType,
      visitorId: visitorId,
      visitorName: visitorName,
      bookingId: visit.bookingId,
      services: unpaidServices,
      status: 'outstanding',
      paymentStatus: 'unpaid',
      totalAmount: unpaidTotal,
      paidAmount: unpaidPaidAmount,
      branchId: visit.branchId,
      notes: visit.notes ? `${visit.notes} (Split from visit ${visit.id})` : `Split from visit ${visit.id}`,
      createdAt: visit.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Update original visit to only include paid services (checked-out)
    // Use the recovered visitor info to ensure it's not lost
    const checkedOutVisit: CheckIn = {
      ...visit,
      visitorType: visitorType,
      visitorId: visitorId,
      visitorName: visitorName,
      services: paidServices,
      status: 'checked-out',
      paymentStatus: 'paid',
      totalAmount: paidTotal,
      paidAmount: paidPaidAmount,
      checkOutTime: visit.checkOutTime || new Date().toISOString(), // Set check-out time if not already set
      updatedAt: new Date().toISOString(),
      notes: visit.notes ? `${visit.notes} (Split - paid services only)` : 'Split - paid services only'
    }
    
    // Save both visits
    try {
      // Create the outstanding visit first
      if (onCreateVisit) {
        await onCreateVisit(outstandingVisit)
      } else {
        // Fallback: use createCheckIn directly
        const { createCheckIn } = await import('../utils/storage')
        await createCheckIn(outstandingVisit)
      }
      
      // Update the original visit to checked-out with paid services only
      await onSave(checkedOutVisit)
      
      alert(`Visit split successfully!\n\n✓ Paid services (${paidTotal.toLocaleString()} EGP) moved to Checked Out\n✓ Unpaid services (${unpaidTotal.toLocaleString()} EGP) moved to Outstanding\n\nBoth visits maintain the original date for accounting.`)
      onCancel() // Close modal after split
    } catch (error) {
      console.error('Error splitting visit:', error)
      alert('Failed to split visit. Please try again.')
    }
  }

  const handleSave = () => {
    if (!editedItem) return

    const updatedServices = selectedServices.map(selected => {
      const service = services.find(s => s.id === selected.serviceId)!
      const name = service.name.toLowerCase()
      
      let price = service.price
      if (isBooking && (name.includes('hourly') || name.includes('private room')) && startTime && endTime) {
        const hours = calculateHours(startTime, endTime)
        price = hours * 250
      }
      
      return {
        serviceId: selected.serviceId,
        name: service.name,
        price: price,
        quantity: selected.quantity,
        paymentStatus: selected.paymentStatus || 'unpaid'
      }
    })

    if (isBooking) {
      const booking = item as Booking
      const selectedMember = members.find(m => m.id === selectedMemberId)
      const selectedCompany = companies.find(c => c.id === selectedCompanyId)
      
      // Check for room conflicts if it's a room booking
      if (booking.resourceType === 'room' && selectedRoomId && bookingDate && startTime && endTime) {
        const startTime24 = convertTo24Hour(startTime)
        const endTime24 = convertTo24Hour(endTime)
        
        if (startTime24 && endTime24) {
          const conflictCheck = checkRoomConflict(selectedRoomId, bookingDate, startTime24, endTime24, booking.id)
          if (conflictCheck.hasConflict && conflictCheck.conflictDetails) {
            const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'selected room'
            const conflictList = conflictCheck.conflictDetails.map(c => 
              `- ${c.name} (${c.type === 'booking' ? 'Booking' : 'Checked In'}): ${c.start} - ${c.end}`
            ).join('\n')
            alert(`⚠️ ROOM CONFLICT DETECTED!\n\nRoom "${roomName}" is already booked for the selected time slot:\n\n${conflictList}\n\nPlease choose a different time or room.`)
            return
          }
        }
      }
      
      const updatedBooking: Booking = {
        ...booking,
        date: bookingDate,
        startTime: startTime,
        endTime: endTime,
        resourceId: selectedRoomId || booking.resourceId,
        bookerType: selectedCompany ? 'company' : (selectedMember ? 'member' : 'visitor'),
        bookerId: selectedMember?.id || selectedCompany?.id || undefined,
        bookerName: selectedMember?.fullName || selectedCompany?.companyName || booking.bookerName,
        services: updatedServices.map(s => ({
          serviceId: s.serviceId,
          name: s.name,
          price: s.price,
          quantity: s.quantity
        })),
        notes: notes,
        updatedAt: new Date().toISOString()
      }
      onSave(updatedBooking)
    } else {
      const visit = item as CheckIn
      const selectedMember = members.find(m => m.id === selectedMemberId)
      const selectedCompany = companies.find(c => c.id === selectedCompanyId)
      
      const totalAmount = updatedServices.reduce((sum, s) => sum + (s.price * s.quantity), 0)
      const paidAmount = calculatePaidAmount()
      const paymentStatus = paidAmount === 0 ? 'unpaid' : (paidAmount >= totalAmount ? 'paid' : 'partial')
      
      const updatedVisit: CheckIn = {
        ...visit,
        visitorType: selectedCompany ? 'company' : (selectedMember ? 'member' : 'visitor'),
        visitorId: selectedMember?.id || selectedCompany?.id || undefined,
        visitorName: selectedMember?.fullName || selectedCompany?.companyName || visit.visitorName,
        services: updatedServices,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
        notes: notes,
        updatedAt: new Date().toISOString()
      }
      onSave(updatedVisit)
    }
    
    setIsEditing(false)
  }

  const availableServices = isBooking 
    ? services.filter(s => {
        const bookerType = (item as Booking).bookerType
        return bookerType === 'member' ? s.availableForMembers : s.availableForCompanies
      })
    : services.filter(s => s.availableForMembers && s.type === 'one-time')

  // Consistent styles
  const sectionStyle = { marginBottom: '32px' }
  const labelStyle = {
    display: 'block',
    marginBottom: '12px',
    fontWeight: '400' as const,
    fontSize: '11px',
    color: '#999999',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px'
  }
  const valueStyle = {
    fontSize: '16px',
    fontWeight: '400' as const,
    color: '#000000',
    letterSpacing: '-0.01em'
  }
  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    transition: 'border-color 0.2s',
    outline: 'none'
  }
  const inputFocusBorderColor = '#999999' // Gray focus border
  const buttonPrimaryStyle = {
    padding: '12px 24px',
    backgroundColor: '#000000',
    color: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '400' as const,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    transition: 'opacity 0.2s'
  }
  const buttonSecondaryStyle = {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#000000',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '400' as const,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    transition: 'all 0.2s'
  }

  return (
    <div 
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(12px)',
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
          maxWidth: '600px', 
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '24px 32px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: '500',
            letterSpacing: '-0.02em',
            color: '#000000'
          }}>
            {isBooking ? 'Booking' : 'Visit'}
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                style={buttonSecondaryStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0'
                }}
              >
                Edit
              </button>
            )}
            <button 
              onClick={onCancel}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.5'
                e.currentTarget.style.backgroundColor = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '32px', flex: 1 }}>
          {/* Member/Company */}
          <div style={sectionStyle}>
            <label style={labelStyle}>
              {isBooking ? 'Booker' : 'Visitor'}
            </label>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value)
                    setSelectedCompanyId('')
                  }}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000000'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0'
                  }}
                >
                  <option value="">Select Member</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value)
                    setSelectedMemberId('')
                  }}
                  style={inputStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#000000'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0'
                  }}
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={valueStyle}>
                {isBooking 
                  ? (item as Booking).bookerName 
                  : (item as CheckIn).visitorName}
              </div>
            )}
          </div>

          {/* Date and Time for Bookings */}
          {isBooking && (
            <div style={sectionStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = inputFocusBorderColor
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0'
                      }}
                    />
                  ) : (
                    <div style={valueStyle}>
                      {bookingDate ? new Date(bookingDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      }) : '—'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Start</label>
                  {isEditing && hasHourlyRoomBooking() ? (
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="10:00 AM"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = inputFocusBorderColor
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0'
                      }}
                    />
                  ) : (
                    <div style={valueStyle}>{startTime || '—'}</div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>End</label>
                  {isEditing && hasHourlyRoomBooking() ? (
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="2:00 PM"
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = inputFocusBorderColor
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0'
                      }}
                    />
                  ) : (
                    <div style={valueStyle}>{endTime || '—'}</div>
                  )}
                </div>
              </div>
              
              {hasHourlyRoomBooking() && startTime && endTime && (
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#f8f8f8', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  color: '#000000',
                  border: '1px solid #f0f0f0'
                }}>
                  Duration: {calculateHours(startTime, endTime).toFixed(1)} {calculateHours(startTime, endTime) === 1 ? 'hour' : 'hours'}
                  {isEditing && (
                    <span style={{ marginLeft: '12px', opacity: 0.6 }}>
                      (Total: {calculateHours(startTime, endTime) * 250} EGP)
                    </span>
                  )}
                </div>
              )}
              
              {(item as Booking).resourceType === 'room' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Room</label>
                  {isEditing ? (
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = inputFocusBorderColor
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0'
                      }}
                    >
                      <option value="">Select Room</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={valueStyle}>
                      {rooms.find(r => r.id === (item as Booking).resourceId)?.name || (item as Booking).resourceId || '—'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Check-in/Check-out for Visits */}
          {!isBooking && (
            <div style={sectionStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Check-in</label>
                  <div style={valueStyle}>
                    {(() => {
                      const checkInTime = getCheckInTime()
                      if (!checkInTime) return '—'
                      try {
                        return checkInTime.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      } catch {
                        return '—'
                      }
                    })()}
                  </div>
                </div>
                {(() => {
                  const checkOutTime = getCheckOutTime()
                  if (!checkOutTime) return null
                  return (
                    <div>
                      <label style={labelStyle}>Check-out</label>
                      <div style={valueStyle}>
                        {(() => {
                          try {
                            return checkOutTime.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          } catch {
                            return '—'
                          }
                        })()}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Services */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Services</label>
            {isEditing ? (
            <div style={{ 
              maxHeight: '280px', 
              overflowY: 'auto', 
              border: '1px solid #e0e0e0', 
              borderRadius: '8px', 
              padding: '8px',
              backgroundColor: '#ffffff'
            }}>
                {availableServices.length === 0 ? (
                  <div style={{ padding: '16px', color: '#999999', fontSize: '14px', textAlign: 'center' }}>
                    No services available
                  </div>
                ) : (
                  availableServices.map(service => {
                    const isSelected = selectedServices.some(s => s.serviceId === service.id)
                    const selectedService = selectedServices.find(s => s.serviceId === service.id)
                    return (
                      <div 
                        key={service.id} 
                        style={{ 
                          padding: '14px 16px', 
                          marginBottom: '8px',
                          border: isSelected ? '1px solid #d0d0d0' : '1px solid #e0e0e0',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? '#fafafa' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => handleServiceToggle(service.id)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#d0d0d0'
                            e.currentTarget.style.backgroundColor = '#fafafa'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#e0e0e0'
                            e.currentTarget.style.backgroundColor = '#ffffff'
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleServiceToggle(service.id)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  cursor: 'pointer',
                                  accentColor: '#000000'
                                }}
                              />
                              <span style={{ 
                                fontWeight: '400', 
                                color: '#000000',
                                fontSize: '15px',
                                letterSpacing: '-0.01em'
                              }}>
                                {service.name}
                              </span>
                            </div>
                            <div style={{ 
                              marginLeft: '30px', 
                              fontSize: '14px', 
                              color: '#666666',
                              fontWeight: '400',
                              marginTop: '4px'
                            }}>
                              {service.price} EGP
                            </div>
                          </div>
                          {isSelected && (
                            <div 
                              style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(service.id, (selectedService?.quantity || 1) - 1)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    border: '1px solid #d0d0d0',
                                    borderRadius: '6px',
                                    background: '#ffffff',
                                    color: '#000000',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#999999'
                                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#d0d0d0'
                                    e.currentTarget.style.backgroundColor = '#ffffff'
                                  }}
                                >
                                  −
                                </button>
                                <span style={{ 
                                  minWidth: '40px', 
                                  textAlign: 'center', 
                                  fontWeight: '400',
                                  color: '#000000',
                                  fontSize: '15px'
                                }}>
                                  {selectedService?.quantity || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(service.id, (selectedService?.quantity || 1) + 1)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    border: '1px solid #d0d0d0',
                                    borderRadius: '6px',
                                    background: '#ffffff',
                                    color: '#000000',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#999999'
                                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#d0d0d0'
                                    e.currentTarget.style.backgroundColor = '#ffffff'
                                  }}
                                >
                                  +
                                </button>
                              </div>
                              {!isBooking && (
                                <button
                                  type="button"
                                  onClick={() => handlePaymentStatusToggle(service.id)}
                                  style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: `1px solid ${(selectedService?.paymentStatus || 'unpaid') === 'paid' ? '#d0d0d0' : '#e0e0e0'}`,
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backgroundColor: (selectedService?.paymentStatus || 'unpaid') === 'paid' ? '#f0f0f0' : 'transparent',
                                    color: '#000000',
                                    letterSpacing: '0.3px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#999999'
                                    if ((selectedService?.paymentStatus || 'unpaid') === 'paid') {
                                      e.currentTarget.style.backgroundColor = '#e5e5e5'
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = (selectedService?.paymentStatus || 'unpaid') === 'paid' ? '#d0d0d0' : '#e0e0e0'
                                    e.currentTarget.style.backgroundColor = (selectedService?.paymentStatus || 'unpaid') === 'paid' ? '#f0f0f0' : 'transparent'
                                  }}
                                >
                                  {(selectedService?.paymentStatus || 'unpaid') === 'paid' ? 'PAID' : 'UNPAID'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div>
                {((item.services || []).length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(item.services || []).map((service, idx) => {
                      const name = service.name || service.name || 'Unknown Service'
                      const paymentStatus = service.paymentStatus || (service as any).paymentStatus || 'unpaid'
                      const isPaid = paymentStatus === 'paid'
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: isPaid ? '#f5f5f5' : '#ffffff',
                            border: `1px solid ${isPaid ? '#d0d0d0' : '#e0e0e0'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: !isBooking ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => {
                            if (!isBooking) {
                              handlePaymentStatusToggle(service.serviceId, true)
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (!isBooking) {
                              e.currentTarget.style.borderColor = '#999999'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isBooking) {
                              e.currentTarget.style.borderColor = isPaid ? '#d0d0d0' : '#e0e0e0'
                            }
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '15px', 
                              fontWeight: '400',
                              color: isPaid ? '#000000' : '#000000',
                              marginBottom: '6px',
                              letterSpacing: '-0.01em'
                            }}>
                              {name} × {service.quantity}
                            </div>
                            <div style={{ 
                              fontSize: '14px', 
                              color: isPaid ? '#666666' : '#666666',
                              fontWeight: '400'
                            }}>
                              {service.price * service.quantity} EGP
                            </div>
                          </div>
                          <div style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            backgroundColor: isPaid ? '#000000' : '#f5f5f5',
                            color: isPaid ? '#ffffff' : '#000000',
                            fontSize: '12px',
                            fontWeight: '500',
                            letterSpacing: '0.3px',
                            border: `1px solid ${isPaid ? '#000000' : '#d0d0d0'}`
                          }}>
                            {isPaid ? 'PAID' : 'UNPAID'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ color: '#999999', fontSize: '14px' }}>No services selected</div>
                )}
              </div>
            )}
          </div>

          {/* Void Reason - Show only for voided visits */}
          {!isBooking && item.status === 'voided' && voidReason && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Void Reason</label>
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #d0d0d0',
                fontSize: '15px',
                color: '#000000',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {voidReason}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Notes</label>
            {isEditing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                style={{
                  ...inputStyle,
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#000000'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0'
                }}
              />
            ) : (
              <div style={valueStyle}>
                {notes || '—'}
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div style={{ 
            padding: '24px 0',
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>
                Total Amount
              </span>
              <span style={{ 
                fontWeight: '500', 
                fontSize: '22px', 
                color: '#000000',
                letterSpacing: '-0.02em'
              }}>
                {totalAmount} EGP
              </span>
            </div>
            {isEditing && hasHourlyRoomBooking() && startTime && endTime && (
              <div style={{ 
                marginTop: '12px', 
                fontSize: '13px', 
                color: '#999999',
                fontWeight: '400'
              }}>
                Hourly rate: 250 EGP/hour
              </div>
            )}
          </div>

          {/* Split Visit - Show when there are both paid and unpaid services */}
          {!isBooking && !isEditing && (() => {
            const visit = item as CheckIn
            if (!visit.services || visit.services.length === 0) return false
            
            const paidServices = visit.services.filter(s => s.paymentStatus === 'paid')
            const unpaidServices = visit.services.filter(s => s.paymentStatus !== 'paid')
            
            // Show split button if there are both paid and unpaid services
            return paidServices.length > 0 && unpaidServices.length > 0 && 
                   (visit.status === 'checked-in' || visit.status === 'checked-out')
          })() && (
            <div style={{ marginBottom: '24px' }}>
              <button
                onClick={handleSplitVisit}
                style={{
                  width: '100%',
                  ...buttonSecondaryStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderColor: '#666666',
                  color: '#000000'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000000'
                  e.currentTarget.style.backgroundColor = '#000000'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#666666'
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#000000'
                }}
              >
                Split Visit (Check Out Paid Services)
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Move to Outstanding */}
          {!isBooking && !isEditing && (item as CheckIn).status !== 'outstanding' && 
           ((item as CheckIn).status === 'checked-in' || (item as CheckIn).status === 'checked-out') && (
            <div style={{ marginBottom: '32px' }}>
              <button
                onClick={() => {
                  const visit = item as CheckIn
                  const updated = {
                    ...visit,
                    status: 'outstanding' as const
                  }
                  onSave(updated)
                }}
                style={{
                  width: '100%',
                  ...buttonSecondaryStyle,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000000'
                  e.currentTarget.style.backgroundColor = '#000000'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0'
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#000000'
                }}
              >
                Move to Outstanding
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <div style={{
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              paddingTop: '24px',
              borderTop: '1px solid #f0f0f0'
            }}>
              <button
                onClick={() => setIsEditing(false)}
                style={buttonSecondaryStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={buttonPrimaryStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
