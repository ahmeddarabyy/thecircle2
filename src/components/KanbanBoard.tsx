
import { useState, useMemo } from 'react'
import { CheckIn, Service, Room, Booking, Member, Company } from '../types'
import EditCheckInForm from './EditCheckInForm'
import DetailEditModal from './DetailEditModal'
import { Clock, Calendar, DollarSign, User, Package, Edit2, ArrowRight, X } from 'lucide-react'

interface KanbanBoardProps {
  checkIns: CheckIn[]
  bookings?: Booking[] // V2 Bookings
  services: Service[]
  rooms: Room[]
  members: Member[]
  companies: Company[]
  timePeriod: 'day' | 'yesterday' | 'week' | 'month' | 'last-month' | 'specific-month' | 'all'
  selectedMonth?: string // Format: YYYY-MM
  onUpdateCheckIn: (checkIn: CheckIn) => void
  onUpdateBooking?: (booking: Booking) => void
}

type Status = 'booked' | 'checked-in' | 'checked-out' | 'voided' | 'outstanding'
// KanbanItem unifies Booking and Visit for display
interface KanbanItem {
  id: string
  // Display fields
  visitorName: string
  dateTime: string // Display time (check-in time or booking start time)

  // Status & Logic
  status: Status

  // Financials
  totalAmount: number
  services: {
    serviceId: string
    name: string
    price: number
    quantity: number
    paymentStatus?: 'paid' | 'unpaid'
  }[]

  // Metadata
  roomId?: string
  roomBookingStartTime?: string
  roomBookingEndTime?: string
  branchId: string

  // Original Objects (optional)
  originalBooking?: Booking
  originalVisit?: CheckIn
}

export default function KanbanBoard({ checkIns, bookings = [], services, rooms, members, companies, timePeriod, selectedMonth, onUpdateCheckIn, onUpdateBooking }: KanbanBoardProps) {
  const [draggedItem, setDraggedItem] = useState<KanbanItem | null>(null)
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null)
  const [detailModalItem, setDetailModalItem] = useState<CheckIn | Booking | null>(null)
  const [isDetailModalBooking, setIsDetailModalBooking] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null)
  const [showVoidReasonModal, setShowVoidReasonModal] = useState(false)
  const [pendingVoidItem, setPendingVoidItem] = useState<KanbanItem | null>(null)
  const [voidReason, setVoidReason] = useState('')

  // Helper to convert "10:00 AM" to "10:00:00" if needed
  function convertTo24Hour(timeStr: string): string {
    if (!timeStr) return '00:00:00'
    const [time, modifier] = timeStr.split(' ')
    let [hours, minutes] = time.split(':')
    if (hours === '12') hours = '00'
    if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12)
    return `${hours}:${minutes}:00`
  }

  // Filter Logic
  const { filteredCheckIns, filteredBookings } = useMemo(() => {
    const isDateInRange = (dateStr: string, startDate: Date, endDate: Date | null) => {
      const date = new Date(dateStr)
      if (endDate) return date >= startDate && date <= endDate
      return date >= startDate
    }

    let startDate: Date = new Date() // Initialize to avoid TS error
    let endDate: Date | null = null

    if (timePeriod !== 'all') {
      const now = new Date()
      switch (timePeriod) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
          break
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
          break
        case 'week':
          const dayOfWeek = now.getDay()
          startDate = new Date(now)
          startDate.setDate(now.getDate() - dayOfWeek)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          break
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
          break
        case 'specific-month':
          if (selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number)
            startDate = new Date(year, month - 1, 1)
            endDate = new Date(year, month, 0, 23, 59, 59, 999)
          } else {
            startDate = new Date()
          }
          break
      }
    }

    // Filter Visits (checkIns)
    // Outstanding items should always be shown regardless of filter
    const fCheckIns = timePeriod === 'all' 
      ? checkIns 
      : (() => {
          // Separate outstanding items (always include them)
          const outstandingItems = checkIns.filter(ci => ci.status === 'outstanding')
          
          // Filter other items by date range
          const filteredItems = checkIns.filter(ci => {
            // Always include outstanding items
            if (ci.status === 'outstanding') return false // Already added above
            
            // Use checkInTime from new schema, fallback to dateTime (legacy)
            const dateStr = ci.checkInTime || ci.dateTime
            if (!dateStr) return false
            return isDateInRange(dateStr, startDate, endDate)
          })
          
          // Combine filtered items with all outstanding items
          return [...filteredItems, ...outstandingItems]
        })()

    // Filter Bookings: Always show all upcoming bookings, sorted by nearest date first
    // (regardless of time period filter)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const fBookings = bookings
      .filter(b => {
        // Only show confirmed or no-show bookings
        if (b.status !== 'confirmed' && b.status !== 'no-show') return false
        
        // Get booking date
        let bookingDate: Date | null = null
        if (b.date) {
          // If we have a date and startTime, combine them
          if (b.startTime) {
            const time24 = convertTo24Hour(b.startTime)
            bookingDate = new Date(`${b.date}T${time24}`)
          } else {
            bookingDate = new Date(b.date + 'T00:00:00')
          }
        } else if (b.expectedStartTime) {
          bookingDate = new Date(b.expectedStartTime)
        }
        
        // Only show upcoming bookings (today or future)
        if (!bookingDate) return false
        const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate())
        return bookingDateOnly >= todayStart
      })
      .sort((a, b) => {
        // Sort by date (nearest first)
        const getBookingDate = (booking: Booking): Date => {
          if (booking.date) {
            if (booking.startTime) {
              const time24 = convertTo24Hour(booking.startTime)
              return new Date(`${booking.date}T${time24}`)
            }
            return new Date(booking.date + 'T00:00:00')
          }
          if (booking.expectedStartTime) {
            return new Date(booking.expectedStartTime)
          }
          return new Date(0) // Fallback for bookings without date
        }
        
        const dateA = getBookingDate(a)
        const dateB = getBookingDate(b)
        return dateA.getTime() - dateB.getTime()
      })

    return { filteredCheckIns: fCheckIns, filteredBookings: fBookings }
  }, [checkIns, bookings, timePeriod, selectedMonth])


  // Map Bookings to KanbanItems
  const bookedItems: KanbanItem[] = useMemo(() => {
    return filteredBookings.map(b => {
      const servicesTotal = (b.services || []).reduce((sum, s) => sum + (s.price * s.quantity), 0)

      return {
        id: b.id,
        visitorName: b.bookerName || b.visitorName || 'Unknown',
        dateTime: b.date ? `${b.date} ${b.startTime}` : (b.expectedStartTime || ''),
        status: 'booked',
        totalAmount: servicesTotal,
        services: (b.services || []).map(s => ({ ...s, name: s.name })), // normalize
        roomId: b.resourceType === 'room' ? b.resourceId : undefined, // Use resourceId
        roomBookingStartTime: b.startTime,
        roomBookingEndTime: b.endTime,
        branchId: b.branchId,
        originalBooking: b
      }
    })
  }, [filteredBookings])

  // Map Visits to KanbanItems
  const mapVisitToItem = (v: CheckIn): KanbanItem => {
    // Try to get visitor name from multiple sources
    let visitorName = v.visitorName || v.memberName
    
    // ALWAYS try to look up visitor name from visitorId if we have it
    // This ensures we can recover visitor info even if visitorName is missing
    if (v.visitorId && v.visitorType) {
      if (v.visitorType === 'member') {
        const member = members.find(m => m.id === v.visitorId)
        if (member) {
          visitorName = member.fullName // Always use member name if found
        }
      } else if (v.visitorType === 'company') {
        const company = companies.find(c => c.id === v.visitorId)
        if (company) {
          visitorName = company.companyName // Always use company name if found
        }
      }
    }
    
    // If still no name, try to get from visitorName field (might be set but empty string)
    if (!visitorName || visitorName.trim() === '') {
      visitorName = v.visitorName || v.memberName || 'Unknown'
    }
    
    return {
      id: v.id,
      visitorName: visitorName || 'Unknown',
      dateTime: v.checkInTime || v.dateTime || new Date().toISOString(),
      status: v.status as Status,
      totalAmount: v.totalAmount,
      services: (v.services || []).map(s => ({ 
        ...s, 
        name: s.name || s.name || 'Unknown Service',
        paymentStatus: s.paymentStatus || 'unpaid' // Ensure paymentStatus is preserved
      })),
      // roomId: v.roomId, // Removed as not on type
      branchId: v.branchId,
      originalVisit: v
    }
  }

  const allVisits = useMemo(() => filteredCheckIns.map(mapVisitToItem), [filteredCheckIns, members, companies])

  const checkedInItems = allVisits.filter(i => i.status === 'checked-in')
  // Sort checked-out items by check-out time (most recent first)
  // Only show fully paid visits in checked-out column
  const checkedOutItems = allVisits
    .filter(i => {
      if (i.status !== 'checked-out') return false
      // Only include fully paid visits
      const visit = i.originalVisit
      if (!visit) return false
      const totalAmount = visit.totalAmount || 0
      const paidAmount = visit.paidAmount || 0
      const paymentStatus = visit.paymentStatus || 'unpaid'
      
      // Must be fully paid (paymentStatus === 'paid' AND paidAmount >= totalAmount)
      return paymentStatus === 'paid' && paidAmount >= totalAmount && totalAmount > 0
    })
    .sort((a, b) => {
      const aCheckOut = a.originalVisit?.checkOutTime
      const bCheckOut = b.originalVisit?.checkOutTime
      
      // If both have check-out times, sort by most recent first
      if (aCheckOut && bCheckOut) {
        return new Date(bCheckOut).getTime() - new Date(aCheckOut).getTime()
      }
      // If only one has check-out time, prioritize it
      if (aCheckOut && !bCheckOut) return -1
      if (!aCheckOut && bCheckOut) return 1
      // If neither has check-out time, maintain original order
      return 0
    })
  const voidedItems = allVisits.filter(i => i.status === 'voided')
  // Outstanding is tricky: It's usually checked-out items that are unpaid.
  // Or explicitly 'outstanding' status if we set that in DB.
  // Architecture plan said: Status 'outstanding' OR payment_status != 'paid' && status != 'voided' && status != 'booked'
  // But strictly, let's use the 'outstanding' status from DB if we use it, OR drive it by payment logic.
  // For Kanban columns, let's stick to status. If user moves to outstanding, status becomes 'outstanding'.
  const outstandingItems = allVisits.filter(i => i.status === 'outstanding')


  // Revenue Calc
  const calcRev = (items: KanbanItem[]) => items.reduce((sum, i) => sum + i.totalAmount, 0)

  const bookedRevenue = calcRev(bookedItems)
  const checkedInRevenue = calcRev(checkedInItems)
  const checkedOutRevenue = calcRev(checkedOutItems)
  const outstandingRevenue = calcRev(outstandingItems)
  const voidedRevenue = calcRev(voidedItems)


  // D&D Handlers
  const handleDragStart = (e: React.DragEvent, item: KanbanItem) => {
    setDraggedItem(item)
    e.dataTransfer.setData('application/json', JSON.stringify(item)) // generic
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault()
    if (!draggedItem) return

    // Allow transitions logic
    // Booking -> Checked-in
    // Checked-in -> Checked-out
    // Checked-in -> Voided
    // Booking -> Voided
    // Checked-out -> Outstanding (if unpaid)
    // Outstanding -> Checked-out (if paid)

    // Simplification for UI: allow most moves, enforce logic on drop
    setDragOverColumn(targetStatus)
  }

  const handleDrop = (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedItem) return
    if (draggedItem.status === targetStatus) return

    // If moving to voided, show reason modal first
    if (targetStatus === 'voided' && draggedItem.originalVisit) {
      setPendingVoidItem(draggedItem)
      setShowVoidReasonModal(true)
      setDraggedItem(null)
      return
    }

    // Validate payment before allowing move to checked-out
    if (targetStatus === 'checked-out' && draggedItem.originalVisit) {
      const totalAmount = draggedItem.originalVisit.totalAmount || 0
      const paidAmount = draggedItem.originalVisit.paidAmount || 0
      const paymentStatus = draggedItem.originalVisit.paymentStatus || 'unpaid'
      
      // Only allow move to checked-out if fully paid
      if (paymentStatus !== 'paid' || paidAmount < totalAmount || totalAmount === 0) {
        const outstandingAmount = totalAmount - paidAmount
        alert(`⚠️ Cannot check out: Payment is not complete.\n\nTotal Amount: ${totalAmount.toLocaleString()} EGP\nPaid Amount: ${paidAmount.toLocaleString()} EGP\nOutstanding: ${outstandingAmount.toLocaleString()} EGP\n\nPlease ensure all services are fully paid before checking out.`)
        setDraggedItem(null)
        return
      }
    }

    // For other status changes, proceed normally
    proceedWithStatusChange(draggedItem, targetStatus)
    setDraggedItem(null)
  }

  const proceedWithStatusChange = (item: KanbanItem, targetStatus: Status, voidReasonText?: string) => {
    // Handle check-out time and date logic:
    // - If moving from checked-in → checked-out: Set check-out time (first time checking out)
    // - If moving from outstanding → checked-out: Preserve original check-out time AND date
    //   (This ensures revenue stays attributed to the original day, not the payment day)
    let checkOutTime = item.originalVisit?.checkOutTime
    let visitDate = item.originalVisit?.date
    
    if (targetStatus === 'checked-out') {
      if (item.status === 'checked-in' && !checkOutTime) {
        // First time checking out - set check-out time
        checkOutTime = new Date().toISOString()
      } else if (item.status === 'outstanding') {
        // Moving back from outstanding - preserve original check-out time and date
        // This ensures accounting accuracy: revenue attributed to original service day
        if (item.originalVisit?.checkOutTime) {
          checkOutTime = item.originalVisit.checkOutTime
        }
        // Preserve original date (for revenue attribution to correct day)
        if (item.originalVisit?.date) {
          visitDate = item.originalVisit.date
        }
      } else if (!checkOutTime) {
        // Fallback: if no check-out time exists, set it now
        checkOutTime = new Date().toISOString()
      }
    }

    // Build payload - prioritize visit data over booking data
    // If it's a visit, use visit data; if it's a booking, use booking data
    const payload = item.originalVisit 
      ? {
          // It's a visit - use visit data
          ...item.originalVisit,
          id: item.id, // Ensure we use the visit ID
          status: targetStatus,
          checkOutTime: checkOutTime,
          date: visitDate, // Preserve original date when moving from outstanding
          // ALWAYS preserve visitor info when moving from outstanding to prevent "unknown" issue
          visitorId: item.originalVisit.visitorId,
          visitorName: item.originalVisit.visitorName,
          visitorType: item.originalVisit.visitorType,
          voidReason: voidReasonText // Pass void reason if provided
        }
      : item.originalBooking
      ? {
          // It's a booking - use booking data (for booking-to-visit conversion)
          ...item.originalBooking,
          id: item.id, // Use the booking ID
          status: targetStatus,
          voidReason: voidReasonText
        }
      : {
          // Fallback (shouldn't happen)
          id: item.id,
          status: targetStatus,
          visitorName: item.visitorName,
          branchId: item.branchId
        } as CheckIn

    onUpdateCheckIn(payload as CheckIn)
  }

  const handleVoidConfirm = () => {
    if (!voidReason.trim()) {
      alert('Please provide a reason for voiding this transaction.')
      return
    }

    if (pendingVoidItem) {
      proceedWithStatusChange(pendingVoidItem, 'voided', voidReason.trim())
      setShowVoidReasonModal(false)
      setPendingVoidItem(null)
      setVoidReason('')
    }
  }

  const handleVoidCancel = () => {
    setShowVoidReasonModal(false)
    setPendingVoidItem(null)
    setVoidReason('')
  }

  // --- Render Helpers ---

  const formatTimePublic = (str: string) => {
    if (!str) return ''
    // Check if ISO
    if (str.includes('T')) {
      const date = new Date(str)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return str // assume already "10:00 AM" etc
  }

  const formatDateTime = (dateTimeStr: string | undefined): string => {
    if (!dateTimeStr) return ''
    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return ''
    }
  }

  const formatBookingDate = (booking: Booking | undefined): string => {
    if (!booking) return ''
    try {
      if (booking.date) {
        // Parse YYYY-MM-DD format correctly
        const dateParts = booking.date.split('-')
        if (dateParts.length === 3) {
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          }
        }
        // Fallback to direct Date parsing
        const date = new Date(booking.date)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        }
      }
      if (booking.expectedStartTime) {
        const date = new Date(booking.expectedStartTime)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        }
      }
    } catch (error) {
      console.error('Error formatting booking date:', error, booking)
    }
    return ''
  }

  const formatBookingTime = (booking: Booking | undefined): string => {
    if (!booking) return ''
    try {
      if (booking.startTime) {
        return booking.startTime // Already in "10:00 AM" format
      }
      if (booking.expectedStartTime) {
        const date = new Date(booking.expectedStartTime)
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        }
      }
    } catch (error) {
      console.error('Error formatting booking time:', error, booking)
    }
    return ''
  }

  const calculateBookingHours = (booking: Booking | undefined): number | null => {
    if (!booking) return null
    const startTime = booking.startTime
    const endTime = booking.endTime
    
    if (!startTime || !endTime) return null
    
    try {
      // Convert both times to 24-hour format (returns "HH:mm:00")
      const start24 = convertTo24Hour(startTime)
      const end24 = convertTo24Hour(endTime)
      
      if (!start24 || !end24) return null
      
      // Parse hours and minutes (format is "HH:mm:00", so we take first two parts)
      const startParts = start24.split(':')
      const endParts = end24.split(':')
      const startHour = parseInt(startParts[0], 10)
      const startMin = parseInt(startParts[1], 10)
      const endHour = parseInt(endParts[0], 10)
      const endMin = parseInt(endParts[1], 10)
      
      // Convert to minutes for calculation
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      
      if (endMinutes <= startMinutes) return null
      
      const diffMinutes = endMinutes - startMinutes
      return diffMinutes / 60 // Convert to hours
    } catch (error) {
      console.error('Error calculating booking hours:', error)
      return null
    }
  }

  const renderCard = (item: KanbanItem, columnStatus?: Status) => {
    const isBooking = item.status === 'booked'
    const booking = item.originalBooking
    const showPaymentStatus = columnStatus === 'checked-in' || columnStatus === 'checked-out'
    
    // Get room name - check both item.roomId and booking.resourceId
    let roomName: string | null = null
    if (booking && booking.resourceType === 'room') {
      const roomId = booking.resourceId || item.roomId
      if (roomId) {
        // Try to find the room by exact ID match
        const room = rooms.find(r => r.id === roomId)
        
        if (room) {
          roomName = room.name
        } else {
          // Debug: log if room not found to help diagnose
          console.warn(`Room not found for ID: ${roomId}`, {
            bookingId: booking.id,
            resourceId: booking.resourceId,
            itemRoomId: item.roomId,
            availableRooms: rooms.map(r => ({ id: r.id, name: r.name, branchId: r.branchId }))
          })
        }
      }
    }
    
    const bookingHours = isBooking && booking ? calculateBookingHours(booking) : null
    
    // Debug logging
    if (isBooking && booking) {
      console.log('Booking card data:', {
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        resourceType: booking.resourceType,
        resourceId: booking.resourceId,
        roomId: item.roomId,
        roomName,
        bookingHours,
        roomsAvailable: rooms.length,
        allRoomIds: rooms.map(r => r.id),
        matchingRoom: booking.resourceType === 'room' ? rooms.find(r => r.id === booking.resourceId) : null
      })
    }

    const handleCardClick = (e: React.MouseEvent) => {
      // Don't open modal if user is dragging
      if (draggedItem?.id === item.id) return
      e.stopPropagation()
      
      if (isBooking && booking) {
        setDetailModalItem(booking)
        setIsDetailModalBooking(true)
      } else if (item.originalVisit) {
        setDetailModalItem(item.originalVisit)
        setIsDetailModalBooking(false)
      }
    }

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onClick={handleCardClick}
        style={{
          backgroundColor: 'white',
          padding: '14px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          opacity: draggedItem?.id === item.id ? 0.5 : 1,
          transition: 'all 0.2s',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
        }}
        onMouseEnter={(e) => {
          if (draggedItem?.id !== item.id) {
            e.currentTarget.style.backgroundColor = '#f9fafb'
            e.currentTarget.style.boxShadow = '0 2px 4px 0 rgb(0 0 0 / 0.1)'
          }
        }}
        onMouseLeave={(e) => {
          if (draggedItem?.id !== item.id) {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)'
          }
        }}
      >
        <div style={{ 
          fontWeight: '600', 
          fontSize: '14px',
          color: '#1e293b',
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '8px'
        }}>
          <User size={16} style={{ color: '#64748b' }} /> 
          <span>{item.visitorName}</span>
        </div>
        
        {/* For bookings, show date and time in green */}
        {isBooking && booking && (
          <>
            <div style={{ 
              fontSize: '12px', 
              color: '#16a34a', 
              fontWeight: '600',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Calendar size={12} />
              {(() => {
                const bookingDate = formatBookingDate(booking)
                const bookingTime = formatBookingTime(booking)
                return bookingDate && bookingTime 
                  ? `${bookingDate} at ${bookingTime}`
                  : bookingDate || bookingTime || item.dateTime || 'No date/time'
              })()}
            </div>
            {/* Show room name and hours if it's a room booking */}
            {booking.resourceType === 'room' && (
              <div style={{
                fontSize: '12px',
                color: '#2563eb',
                fontWeight: '500',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Package size={12} />
                <span>Room: {roomName || booking.resourceId || 'Unknown Room'}</span>
                {bookingHours !== null && bookingHours > 0 && (
                  <span style={{ marginLeft: '4px', fontWeight: '600' }}>
                    ({bookingHours.toFixed(1)} {bookingHours === 1 ? 'hour' : 'hours'})
                  </span>
                )}
              </div>
            )}
          </>
        )}
        
        {/* For non-bookings, show check-in/check-out times */}
        {!isBooking && item.originalVisit && (
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Check-in time - show for checked-in, checked-out, and outstanding */}
            {item.originalVisit.checkInTime && (
              <div style={{ 
                fontSize: '12px', 
                color: '#16a34a',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Clock size={12} />
                Check-in: {formatDateTime(item.originalVisit.checkInTime)}
              </div>
            )}
            {/* Check-out time - show only for checked-out */}
            {item.status === 'checked-out' && item.originalVisit.checkOutTime && (
              <div style={{ 
                fontSize: '12px', 
                color: '#dc2626',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Clock size={12} />
                Check-out: {formatDateTime(item.originalVisit.checkOutTime)}
              </div>
            )}
          </div>
        )}
        
        {/* Payment information - show for visits (not bookings) */}
        {!isBooking && item.originalVisit && (
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span style={{ 
                fontSize: '12px', 
                color: '#64748b',
                fontWeight: '500'
              }}>
                Total Amount:
              </span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '700',
                color: '#1e293b'
              }}>
                {(item.originalVisit.totalAmount || 0).toLocaleString()} EGP
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ 
                fontSize: '12px', 
                color: '#64748b',
                fontWeight: '500'
              }}>
                Paid:
              </span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '700',
                color: '#16a34a'
              }}>
                {(item.originalVisit.paidAmount || 0).toLocaleString()} EGP
              </span>
            </div>
            {((item.originalVisit.totalAmount || 0) - (item.originalVisit.paidAmount || 0)) > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#dc2626',
                  fontWeight: '500'
                }}>
                  Remaining:
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '700',
                  color: '#dc2626'
                }}>
                  {((item.originalVisit.totalAmount || 0) - (item.originalVisit.paidAmount || 0)).toLocaleString()} EGP
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* For bookings, show total amount only */}
        {isBooking && (
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '14px', 
            fontWeight: '600',
            color: '#1e293b'
          }}>
            {item.totalAmount} EGP
          </div>
        )}

        {/* Show when moved to outstanding - timestamp only (payment info already shown above) */}
        {columnStatus === 'outstanding' && !isBooking && item.originalVisit?.updatedAt && (
          <div style={{ 
            marginTop: '8px',
            fontSize: '11px', 
            color: '#64748b',
            fontWeight: '400',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={10} />
            Moved to outstanding: {formatDateTime(item.originalVisit.updatedAt)}
          </div>
        )}

        {/* Services with payment status - only for checked-in and checked-out */}
        {showPaymentStatus && item.services && item.services.length > 0 && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px',
              marginBottom: '0'
            }}>
              {item.services.map((service, idx) => {
                const name = service.name || service.name || 'Unknown Service'
                const isPaid = service.paymentStatus === 'paid'
                
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      backgroundColor: isPaid ? '#dcfce7' : '#fef2f2',
                      border: `1px solid ${isPaid ? '#86efac' : '#fecaca'}`,
                      fontSize: '11px',
                      fontWeight: '500'
                    }}
                  >
                    <span style={{ color: isPaid ? '#166534' : '#991b1b' }}>
                      {name}
                      {service.quantity > 1 && ` × ${service.quantity}`}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: isPaid ? '#22c55e' : '#ef4444',
                        marginLeft: '4px'
                      }}
                      title={isPaid ? 'Paid' : 'Unpaid'}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    )
  }

  const renderColumn = (title: string, items: KanbanItem[], status: Status, revenue: number) => {
    // Check if this is the Bookings column for horizontal layout
    const isBookings = status === 'booked'
    
    return (
      <div 
        style={{
          width: '100%',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: isBookings ? '280px' : '650px', // Fixed height for scrollable container
          maxHeight: isBookings ? '280px' : '650px',
          overflow: 'hidden', // Prevent outer container from scrolling
          boxSizing: 'border-box' // Include padding in height calculation
        }}
        onDragOver={(e) => handleDragOver(e, status)}
        onDrop={(e) => handleDrop(e, status)}
      >
      {/* Header with title and count */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px',
        flexShrink: 0 // Keep header fixed
      }}>
        <span style={{ 
          fontWeight: 'bold', 
          textTransform: 'uppercase',
          fontSize: '14px',
          color: '#1e293b',
          letterSpacing: '0.5px'
        }}>
          {title}
        </span>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: '700',
          color: '#1e293b'
        }}>
          {items.length}
        </span>
      </div>
      
      {/* Revenue */}
      <div style={{ 
        fontSize: '13px', 
        color: '#64748b',
        marginBottom: '20px',
        fontWeight: '500',
        flexShrink: 0 // Keep revenue fixed
      }}>
        <span style={{ color: '#64748b' }}>REVENUE</span>
        <span style={{ marginLeft: '8px', color: '#1e293b', fontWeight: '600' }}>
          {revenue} EGP
        </span>
      </div>
      
      {/* Items list - scrollable */}
      <div style={{ 
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: isBookings ? 'row' : 'column',
        gap: '12px',
        overflowX: isBookings ? 'auto' : 'hidden', // Horizontal scroll for bookings
        overflowY: isBookings ? 'hidden' : 'auto', // Vertical scroll for other columns
        flexWrap: 'nowrap', // Don't wrap - force scrolling instead
        minHeight: 0, // Critical for flex scrolling to work
        maxHeight: '100%', // Ensure it respects parent height
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        position: 'relative' // Help with scrolling context
      }}>
        {items.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: '500',
            width: isBookings ? '100%' : 'auto'
          }}>
            No items
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{ 
              minWidth: isBookings ? '280px' : 'auto',
              width: isBookings ? '280px' : '100%',
              flexShrink: 0 // Prevent items from shrinking - ensures all items are visible
            }}>
              {renderCard(item, status)}
            </div>
          ))
        )}
      </div>
    </div>
    )
  }

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      paddingBottom: '20px'
    }}>
      {/* Row 1: Bookings - Full width horizontal */}
      <div style={{ width: '100%' }}>
        {renderColumn('Bookings', bookedItems, 'booked', bookedRevenue)}
      </div>

      {/* Row 2: Checked In and Checked Out - Side by side */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {renderColumn('Checked In', checkedInItems, 'checked-in', checkedInRevenue)}
        {renderColumn('Checked Out', checkedOutItems, 'checked-out', checkedOutRevenue)}
      </div>

      {/* Row 3: Outstanding and Voided - Side by side */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px'
      }}>
        {renderColumn('Outstanding', outstandingItems, 'outstanding', outstandingRevenue)}
        {renderColumn('Voided', voidedItems, 'voided', voidedRevenue)}
      </div>

      {editingCheckIn && (
        <EditCheckInForm
          checkIn={editingCheckIn}
          onSave={(updated) => {
            onUpdateCheckIn(updated)
            setEditingCheckIn(null)
          }}
          onCancel={() => setEditingCheckIn(null)}
          services={services}
        />
      )}

      {detailModalItem && (
        <DetailEditModal
          item={detailModalItem}
          isBooking={isDetailModalBooking}
          members={members}
          companies={companies}
          services={services}
          rooms={rooms}
          bookings={bookings}
          checkIns={checkIns}
          onSave={async (updated) => {
            if (isDetailModalBooking) {
              if (onUpdateBooking) {
                onUpdateBooking(updated as Booking)
              }
            } else {
              await onUpdateCheckIn(updated as CheckIn)
            }
            setDetailModalItem(null)
          }}
          onCreateVisit={async (newVisit) => {
            // Create new visit (for split functionality)
            await onUpdateCheckIn(newVisit)
          }}
          onCancel={() => setDetailModalItem(null)}
        />
      )}

      {/* Void Reason Modal */}
      {showVoidReasonModal && pendingVoidItem && (
        <div 
          onClick={handleVoidCancel}
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
              maxWidth: '500px', 
              width: '100%',
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
                fontWeight: '600',
                color: '#000000'
              }}>
                Void Transaction
              </h2>
              <button 
                onClick={handleVoidCancel}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '15px', 
                  color: '#666666',
                  marginBottom: '16px'
                }}>
                  You are about to void the transaction for <strong>{pendingVoidItem.visitorName}</strong>.
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#999999'
                }}>
                  Please provide a reason for voiding this transaction:
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: '#999999',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Reason *
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Enter reason for voiding this transaction..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '14px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '15px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#999999'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0'
                  }}
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end',
                paddingTop: '24px',
                borderTop: '1px solid #f0f0f0'
              }}>
                <button
                  onClick={handleVoidCancel}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#000000',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#999999'
                    e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0'
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoidConfirm}
                  disabled={!voidReason.trim()}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: voidReason.trim() ? '#000000' : '#e0e0e0',
                    color: voidReason.trim() ? '#ffffff' : '#999999',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: voidReason.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (voidReason.trim()) {
                      e.currentTarget.style.backgroundColor = '#333333'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (voidReason.trim()) {
                      e.currentTarget.style.backgroundColor = '#000000'
                    }
                  }}
                >
                  Confirm Void
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
