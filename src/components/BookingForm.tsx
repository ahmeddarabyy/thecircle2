import { useState, useEffect } from 'react'
import { Member, Company, Service, CheckIn, Room, InventoryItem } from '../types'

interface BookingFormProps {
  members: Member[]
  companies: Company[]
  services: Service[]
  rooms: Room[]
  checkIns: CheckIn[] // Existing check-ins to check for conflicts
  bookings?: Booking[] // Existing bookings to check for conflicts
  inventory: InventoryItem[]
  branchId: string | null
  preSelectedMemberId?: string | null
  preSelectedCompanyId?: string | null
  onSave: (booking: Booking) => void
  onCancel: () => void
}

import { Booking } from '../types'

export default function BookingForm({ members, companies, services, rooms, checkIns, bookings = [], inventory, branchId, preSelectedMemberId, preSelectedCompanyId, onSave, onCancel }: BookingFormProps) {
  const [bookingType, setBookingType] = useState<'member' | 'company'>(preSelectedCompanyId ? 'company' : 'member')
  const [selectedMemberId, setSelectedMemberId] = useState(preSelectedMemberId || '')
  const [selectedCompanyId, setSelectedCompanyId] = useState(preSelectedCompanyId || '')
  const [selectedServices, setSelectedServices] = useState<{ serviceId: string; quantity: number }[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [roomStartTime, setRoomStartTime] = useState('12:00 AM')
  const [roomEndTime, setRoomEndTime] = useState('12:00 AM')

  // Update selections if pre-selected IDs are provided
  useEffect(() => {
    if (preSelectedMemberId) {
      setBookingType('member')
      setSelectedMemberId(preSelectedMemberId)
    }
    if (preSelectedCompanyId) {
      setBookingType('company')
      setSelectedCompanyId(preSelectedCompanyId)
    }
  }, [preSelectedMemberId, preSelectedCompanyId])

  // Filter services based on booking type
  const availableServices = services.filter(s =>
    bookingType === 'member' ? s.availableForMembers : s.availableForCompanies
  )

  // Filter rooms by branch
  const filteredRooms = branchId ? rooms.filter(r => r.branchId === branchId) : rooms

  // Check if private room booking service is selected
  const hasPrivateRoomBooking = selectedServices.some(selected => {
    const service = availableServices.find(s => s.id === selected.serviceId)
    const name = service?.name.toLowerCase() || ''
    return name.includes('private room') || name.includes('room booking') || name.includes('hourly')
  })

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

  // Calculate hours between start and end time
  const calculateRoomHours = (): number => {
    if (!roomStartTime || !roomEndTime) return 0

    const start24 = convertTo24Hour(roomStartTime)
    const end24 = convertTo24Hour(roomEndTime)

    const [startHour, startMin] = start24.split(':').map(Number)
    const [endHour, endMin] = end24.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (endMinutes <= startMinutes) return 0

    const diffMinutes = endMinutes - startMinutes
    return diffMinutes / 60 // Convert to hours
  }

  const roomBookingHours = calculateRoomHours()
  const ROOM_HOURLY_RATE = 250 // EGP per hour

  // Get existing bookings for a room on a specific date
  const getExistingBookingsForRoom = (roomId: string, bookingDate: string) => {
    if (!roomId || !bookingDate) return []
    
    const existing: Array<{ type: 'booking' | 'checkin', name: string, start: string, end: string }> = []
    
    // Check existing bookings
    bookings.forEach(booking => {
      if (booking.resourceType === 'room' && booking.resourceId === roomId && booking.date === bookingDate) {
        if (booking.status === 'confirmed' || booking.status === 'no-show') {
          existing.push({
            type: 'booking',
            name: booking.bookerName || booking.visitorName || 'Unknown',
            start: booking.startTime || '',
            end: booking.endTime || ''
          })
        }
      }
    })
    
    // Check existing check-ins (visits)
    checkIns.forEach(checkIn => {
      if (checkIn.roomId === roomId) {
        const checkInDate = checkIn.date || (checkIn.checkInTime ? new Date(checkIn.checkInTime).toISOString().split('T')[0] : '')
        if (checkInDate === bookingDate && checkIn.roomBookingStartTime && checkIn.roomBookingEndTime) {
          // Convert 24-hour format to 12-hour for display
          const convertTo12Hour = (time24: string) => {
            const [h, m] = time24.split(':').map(Number)
            const period = h >= 12 ? 'PM' : 'AM'
            const hour12 = h % 12 || 12
            return `${hour12}:${String(m).padStart(2, '0')} ${period}`
          }
          existing.push({
            type: 'checkin',
            name: checkIn.visitorName || checkIn.memberName || 'Unknown',
            start: convertTo12Hour(checkIn.roomBookingStartTime),
            end: convertTo12Hour(checkIn.roomBookingEndTime)
          })
        }
      }
    })
    
    return existing
  }

  // Check for room booking conflicts - returns conflict details if found
  const checkRoomConflict = (roomId: string, bookingDate: string, startTime24: string, endTime24: string): { hasConflict: boolean; conflictDetails?: Array<{ type: 'booking' | 'checkin', name: string, start: string, end: string }> } => {
    if (!roomId || !bookingDate || !startTime24 || !endTime24) {
      console.log('checkRoomConflict: Missing required params', { roomId, bookingDate, startTime24, endTime24 })
      return { hasConflict: false }
    }

    console.log('checkRoomConflict called:', { roomId, bookingDate, startTime24, endTime24 })
    console.log('Total bookings to check:', bookings.length)
    console.log('Total checkIns to check:', checkIns.length)

    const bookingStart = new Date(`${bookingDate}T${startTime24}`)
    const bookingEnd = new Date(`${bookingDate}T${endTime24}`)
    const conflicts: Array<{ type: 'booking' | 'checkin', name: string, start: string, end: string }> = []

    // Check existing bookings
    bookings.forEach(booking => {
      console.log('Checking booking:', {
        id: booking.id,
        resourceType: booking.resourceType,
        resourceId: booking.resourceId,
        date: booking.date,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        roomId,
        bookingDate
      })
      
      if (booking.resourceType !== 'room' || booking.resourceId !== roomId) {
        console.log('  -> Skipped: wrong resource type or room')
        return
      }
      if (booking.date !== bookingDate) {
        console.log('  -> Skipped: different date')
        return
      }
      if (booking.status !== 'confirmed' && booking.status !== 'no-show') {
        console.log('  -> Skipped: wrong status')
        return
      }
      
      if (!booking.startTime || !booking.endTime) {
        console.log('  -> Skipped: missing times')
        return
      }
      
      // Convert booking times to 24-hour format for comparison
      const existingStart24 = convertTo24Hour(booking.startTime)
      const existingEnd24 = convertTo24Hour(booking.endTime)
      
      console.log('  -> Converted times:', { existingStart24, existingEnd24 })
      
      if (!existingStart24 || !existingEnd24) {
        console.log('  -> Skipped: conversion failed')
        return
      }
      
      const existingStart = new Date(`${bookingDate}T${existingStart24}`)
      const existingEnd = new Date(`${bookingDate}T${existingEnd24}`)
      
      console.log('  -> Comparing:', {
        bookingStart: bookingStart.toISOString(),
        bookingEnd: bookingEnd.toISOString(),
        existingStart: existingStart.toISOString(),
        existingEnd: existingEnd.toISOString(),
        overlap: bookingStart < existingEnd && bookingEnd > existingStart
      })
      
      // Check for overlap: new booking overlaps if it starts before existing ends AND ends after existing starts
      if (bookingStart < existingEnd && bookingEnd > existingStart) {
        console.log('  -> CONFLICT FOUND!')
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

  const calculateTotal = () => {
    const servicesTotal = selectedServices.reduce((total, selected) => {
      const service = availableServices.find(s => s.id === selected.serviceId)
      // Don't include private room booking price in service total - it's calculated separately
      if (service?.name.toLowerCase().includes('private room')) {
        return total
      }
      return total + (service ? service.price * selected.quantity : 0)
    }, 0)

    // Add room booking cost (hours * rate)
    const roomBookingCost = hasPrivateRoomBooking ? roomBookingHours * ROOM_HOURLY_RATE : 0

    return servicesTotal + roomBookingCost
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (bookingType === 'member' && !selectedMemberId) return
    if (bookingType === 'company' && !selectedCompanyId) return
    if (selectedServices.length === 0) return
    if (hasPrivateRoomBooking && !selectedRoomId) {
      alert('Please select a room for private room booking')
      return
    }
    if (hasPrivateRoomBooking && (!roomStartTime || !roomEndTime)) {
      alert('Please select start and end time for room booking')
      return
    }
    if (hasPrivateRoomBooking && roomBookingHours <= 0) {
      alert('End time must be after start time')
      return
    }
    // For private room bookings, use room start time; otherwise use booking time
    let expectedStartTime: string
    let expectedEndTime: string | undefined

    if (hasPrivateRoomBooking) {
      if (!roomStartTime) {
        alert('Please select room booking start time')
        return
      }
      const startTime24 = convertTo24Hour(roomStartTime)
      expectedStartTime = new Date(`${bookingDate}T${startTime24}`).toISOString()

      const endTime24 = convertTo24Hour(roomEndTime)
      expectedEndTime = new Date(`${bookingDate}T${endTime24}`).toISOString()

      // Check for room conflicts
      const conflictCheck = checkRoomConflict(selectedRoomId, bookingDate, startTime24, endTime24)
      if (conflictCheck.hasConflict) {
        const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'selected room'
        const conflictList = conflictCheck.conflictDetails?.map(c => 
          `- ${c.name} (${c.type === 'booking' ? 'Booking' : 'Checked In'}): ${c.start} - ${c.end}`
        ).join('\n') || ''
        alert(`⚠️ ROOM CONFLICT DETECTED!\n\nRoom "${roomName}" is already booked for the selected time slot:\n\n${conflictList}\n\nPlease choose a different time or room.`)
        return
      }
    } else {
      if (!bookingDate || !bookingTime) {
        alert('Please select booking date and time')
        return
      }
      // bookingTime is in 24-hour format, use it directly
      expectedStartTime = new Date(`${bookingDate}T${bookingTime}`).toISOString()
      // Default duration 1 hour for simple service booking if not room
      const startDate = new Date(expectedStartTime)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
      expectedEndTime = endDate.toISOString()
    }

    const selectedMember = bookingType === 'member'
      ? members.find(m => m.id === selectedMemberId)
      : null
    const selectedCompany = bookingType === 'company'
      ? companies.find(c => c.id === selectedCompanyId)
      : null

    if (!selectedMember && !selectedCompany) return

    const bookingServices = selectedServices.map(selected => {
      const service = availableServices.find(s => s.id === selected.serviceId)!
      // For private room booking, update the price based on hours
      if (service.name.toLowerCase().includes('private room') && hasPrivateRoomBooking) {
        return {
          serviceId: service.id,
          serviceName: `${service.name} (${roomBookingHours} ${roomBookingHours === 1 ? 'hour' : 'hours'})`,
          price: ROOM_HOURLY_RATE,
          quantity: roomBookingHours,
          paymentStatus: 'unpaid' as const
        }
      }
      return {
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        quantity: selected.quantity,
        paymentStatus: 'unpaid' as const
      }
    })

    if (!branchId) {
      alert('Please select a branch first')
      return
    }

    // Track inventory items sold
    const inventoryItemsSold: { itemId: string; itemName: string; quantity: number }[] = []
    selectedServices.forEach(selected => {
      const service = availableServices.find(s => s.id === selected.serviceId)
      if (service?.inventoryItemId) {
        const inventoryItem = inventory.find(inv => inv.id === service.inventoryItemId)
        if (inventoryItem) {
          const quantityPerSale = service.inventoryQuantityPerSale || 1
          const totalQuantity = selected.quantity * quantityPerSale
          inventoryItemsSold.push({
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            quantity: totalQuantity
          })
        }
      }
    })

    const booking: Booking = {
      id: `booking-${Date.now()}`,
      date: bookingDate,
      startTime: hasPrivateRoomBooking ? roomStartTime : (() => {
        // Convert bookingTime (24-hour) back to 12-hour format
        const [h, m] = bookingTime.split(':').map(Number)
        const period = h >= 12 ? 'PM' : 'AM'
        const hour12 = h % 12 || 12
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`
      })(),
      endTime: hasPrivateRoomBooking ? roomEndTime : (() => {
        // Default to 1 hour after start
        const [h, m] = bookingTime.split(':').map(Number)
        const endHour = (h + 1) % 24
        const period = endHour >= 12 ? 'PM' : 'AM'
        const hour12 = endHour % 12 || 12
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`
      })(),
      resourceType: hasPrivateRoomBooking ? 'room' : 'desk',
      resourceId: hasPrivateRoomBooking ? selectedRoomId : undefined,
      bookerType: bookingType === 'member' ? 'member' : 'company',
      bookerId: bookingType === 'member' ? selectedMemberId : selectedCompanyId,
      bookerName: bookingType === 'member'
        ? selectedMember!.fullName
        : selectedCompany!.companyName,
      status: 'confirmed',
      branchId: branchId,
      services: bookingServices,
      notes: '',
      createdAt: new Date().toISOString(),
      // Legacy fields for compatibility
      expectedStartTime,
      expectedEndTime,
      visitorName: bookingType === 'member'
        ? selectedMember!.fullName
        : selectedCompany!.companyName
    }

    onSave(booking)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create Booking in Advance</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Booking Type *</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="member"
                  checked={bookingType === 'member'}
                  onChange={() => {
                    setBookingType('member')
                    setSelectedMemberId('')
                    setSelectedCompanyId('')
                  }}
                  style={{ marginRight: '8px' }}
                />
                Individual Member
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="company"
                  checked={bookingType === 'company'}
                  onChange={() => {
                    setBookingType('company')
                    setSelectedMemberId('')
                    setSelectedCompanyId('')
                  }}
                  style={{ marginRight: '8px' }}
                />
                Company
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {bookingType === 'member' ? 'Select Member *' : 'Select Company *'}
            </label>
            {bookingType === 'member' ? (
              <select
                className="form-select"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                required
              >
                <option value="">Choose a member...</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} ({member.email})
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="form-select"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                required
              >
                <option value="">Choose a company...</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.companyName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Booking Date *</label>
            <input
              type="date"
              className="form-input"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {!hasPrivateRoomBooking && (
            <div className="form-group">
              <label className="form-label">Booking Time *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <select
                  className="form-select"
                  value={bookingTime ? (() => {
                    const [h] = bookingTime.split(':').map(Number)
                    const hour12 = h % 12 || 12
                    return String(hour12)
                  })() : ''}
                  onChange={(e) => {
                    const hour = e.target.value
                    const current = bookingTime || '00:00'
                    const [h, m] = current.split(':').map(Number)
                    const period = h >= 12 ? 'PM' : 'AM'
                    const newTime12 = `${hour}:${String(m).padStart(2, '0')} ${period}`
                    setBookingTime(convertTo24Hour(newTime12))
                  }}
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={bookingTime ? bookingTime.split(':')[1] : ''}
                  onChange={(e) => {
                    const minute = e.target.value
                    const current = bookingTime || '00:00'
                    const [h] = current.split(':').map(Number)
                    const hour12 = h % 12 || 12
                    const period = h >= 12 ? 'PM' : 'AM'
                    const newTime12 = `${hour12}:${minute} ${period}`
                    setBookingTime(convertTo24Hour(newTime12))
                  }}
                  required
                >
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={bookingTime ? (() => {
                    const [h] = bookingTime.split(':').map(Number)
                    return h >= 12 ? 'PM' : 'AM'
                  })() : 'AM'}
                  onChange={(e) => {
                    const period = e.target.value
                    const current = bookingTime || '00:00'
                    const [h, m] = current.split(':').map(Number)
                    const hour12 = h % 12 || 12
                    const newTime12 = `${hour12}:${String(m).padStart(2, '0')} ${period}`
                    setBookingTime(convertTo24Hour(newTime12))
                  }}
                  required
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Select Services *</label>
            <div className="selection-list" style={{ maxHeight: '250px' }}>
              {availableServices.length === 0 ? (
                <p className="form-helper-text" style={{ padding: '8px' }}>No services available.</p>
              ) : (
                availableServices.map(service => {
                  const isSelected = selectedServices.some(s => s.serviceId === service.id)
                  const selectedService = selectedServices.find(s => s.serviceId === service.id)
                  return (
                    <div
                      key={service.id}
                      className={`selection-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleServiceToggle(service.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleServiceToggle(service.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                              {service.name}
                            </span>
                          </div>
                          <div style={{ marginLeft: '28px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {service.price} EGP
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => handleQuantityChange(service.id, (selectedService?.quantity || 1) - 1)}
                              style={{ padding: '4px 8px', height: 'auto' }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: '500', color: 'var(--text-primary)' }}>
                              {selectedService?.quantity || 1}
                            </span>
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => handleQuantityChange(service.id, (selectedService?.quantity || 1) + 1)}
                              style={{ padding: '4px 8px', height: 'auto' }}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {hasPrivateRoomBooking && (
            <>
              <div className="form-group">
                <label className="form-label">Select Room *</label>
                <select
                  className="form-select"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  required
                >
                  <option value="">Choose a room...</option>
                  {filteredRooms.length === 0 ? (
                    <option value="" disabled>No rooms available for this branch</option>
                  ) : (
                    filteredRooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name} (Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'})
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              {/* Show existing bookings for selected room and date */}
              {selectedRoomId && bookingDate && (() => {
                const existingBookings = getExistingBookingsForRoom(selectedRoomId, bookingDate)
                if (existingBookings.length === 0) return null
                
                return (
                  <div className="form-group">
                    <label className="form-label" style={{ color: '#dc2626', fontWeight: '600' }}>
                      ⚠️ Existing Bookings for {rooms.find(r => r.id === selectedRoomId)?.name || 'this room'} on {new Date(bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}:
                    </label>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#fef2f2', 
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}>
                      {existingBookings.map((booking, idx) => (
                        <div key={idx} style={{ 
                          marginBottom: idx < existingBookings.length - 1 ? '8px' : '0',
                          paddingBottom: idx < existingBookings.length - 1 ? '8px' : '0',
                          borderBottom: idx < existingBookings.length - 1 ? '1px solid #fecaca' : 'none'
                        }}>
                          <span style={{ fontWeight: '600', color: '#991b1b' }}>
                            {booking.name}
                          </span>
                          {' '}
                          <span style={{ color: '#7f1d1d' }}>
                            ({booking.type === 'booking' ? 'Booking' : 'Checked In'})
                          </span>
                          {' '}
                          <span style={{ color: '#991b1b' }}>
                            {booking.start} - {booking.end}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <div className="form-group">
                <label className="form-label">Room Booking Time Slot *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-helper-text" style={{ marginBottom: '4px' }}>
                      Start Time
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                      <select
                        className="form-select"
                        value={roomStartTime ? (roomStartTime.match(/^(\d+):/) || ['', '12'])[1] : '12'}
                        onChange={(e) => {
                          const hour = e.target.value
                          const current = roomStartTime || '12:00 AM'
                          const match = current.match(/(\d+):(\d+)\s+(AM|PM)/i)
                          const min = match ? match[2] : '00'
                          const period = match ? match[3] : 'AM'
                          setRoomStartTime(`${hour}:${min} ${period}`)
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={roomStartTime ? (roomStartTime.match(/:(\d+)\s+(AM|PM)/i) || ['', '00'])[1] : '00'}
                        onChange={(e) => {
                          const minute = e.target.value
                          const current = roomStartTime || '12:00 AM'
                          const match = current.match(/(\d+):(\d+)\s+(AM|PM)/i)
                          const hour = match ? match[1] : '12'
                          const period = match ? match[3] : 'AM'
                          setRoomStartTime(`${hour}:${minute} ${period}`)
                        }}
                        required
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={roomStartTime ? (roomStartTime.match(/(AM|PM)/i) || ['AM'])[0].toUpperCase() : 'AM'}
                        onChange={(e) => {
                          const period = e.target.value
                          const current = roomStartTime || '12:00 AM'
                          const match = current.match(/(\d+):(\d+)\s+(AM|PM)/i)
                          const hour = match ? match[1] : '12'
                          const minute = match ? match[2] : '00'
                          setRoomStartTime(`${hour}:${minute} ${period}`)
                        }}
                        required
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-helper-text" style={{ marginBottom: '4px' }}>
                      End Time
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                      <select
                        className="form-select"
                        value={roomEndTime ? (roomEndTime.match(/^(\d+):/) || ['', '12'])[1] : '12'}
                        onChange={(e) => {
                          const hour = e.target.value
                          const current = roomEndTime || '12:00 AM'
                          const match = current.match(/(\d+):(\d+)\s+(AM|PM)/i)
                          const min = match ? match[2] : '00'
                          const period = match ? match[3] : 'AM'
                          setRoomEndTime(`${hour}:${min} ${period}`)
                        }}
                        required
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={roomEndTime ? (roomEndTime.match(/:(\d+)\s+(AM|PM)/i) || ['', '00'])[1] : '00'}
                        onChange={(e) => {
                          const minute = e.target.value
                          const current = roomEndTime || '12:00 AM'
                          const match = current.match(/(\d+):(\d+)\s+(AM|PM)/i)
                          const hour = match ? match[1] : '12'
                          const period = match ? match[3] : 'AM'
                          setRoomEndTime(`${hour}:${minute} ${period}`)
                        }}
                        required
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="form-select"
                        value={roomEndTime ? (roomEndTime.match(/(AM|PM)/i) || ['AM'])[0].toUpperCase() : 'AM'}
                        onChange={(e) => {
                          const period = e.target.value
                          const current = roomEndTime || '12:00 AM'
                          const match = current.match(/(\d+):(\d+)\s+(AM|PM)/i)
                          const hour = match ? match[1] : '12'
                          const minute = match ? match[2] : '00'
                          setRoomEndTime(`${hour}:${minute} ${period}`)
                        }}
                        required
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
                {roomStartTime && roomEndTime && (
                  <div className="info-box">
                    <div className="info-box-row" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      <strong>Time Slot:</strong> {roomStartTime} - {roomEndTime}
                    </div>
                    <div className="info-box-row" style={{ color: 'var(--text-primary)' }}>
                      <strong>Duration:</strong> {roomBookingHours.toFixed(1)} {roomBookingHours === 1 ? 'hour' : 'hours'}
                    </div>
                    <div className="info-box-row" style={{ color: 'var(--text-primary)' }}>
                      <strong>Room Cost:</strong> {roomBookingHours * ROOM_HOURLY_RATE} EGP ({roomBookingHours.toFixed(1)} × {ROOM_HOURLY_RATE} EGP/hour)
                    </div>
                    {roomBookingHours <= 0 && (
                      <div className="form-helper-text" style={{ color: '#ef4444' }}>
                        ⚠️ End time must be after start time
                      </div>
                    )}
                    {selectedRoomId && bookingDate && roomStartTime && roomEndTime && (() => {
                      const startTime24 = convertTo24Hour(roomStartTime)
                      const endTime24 = convertTo24Hour(roomEndTime)
                      const conflictCheck = checkRoomConflict(selectedRoomId, bookingDate, startTime24, endTime24)
                      if (conflictCheck.hasConflict && conflictCheck.conflictDetails) {
                        return (
                          <div style={{ 
                            marginTop: '12px', 
                            padding: '12px', 
                            backgroundColor: '#fef2f2', 
                            border: '2px solid #dc2626',
                            borderRadius: '6px'
                          }}>
                            <div style={{ color: '#dc2626', fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>
                              ⚠️ CONFLICT DETECTED: This time slot overlaps with existing bookings!
                            </div>
                            <div style={{ fontSize: '13px', color: '#991b1b' }}>
                              {conflictCheck.conflictDetails.map((conflict, idx) => (
                                <div key={idx} style={{ marginBottom: '4px' }}>
                                  <strong>{conflict.name}</strong> ({conflict.type === 'booking' ? 'Booking' : 'Checked In'}) - {conflict.start} to {conflict.end}
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#7f1d1d', fontStyle: 'italic' }}>
                              Please choose a different time slot or room to proceed.
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>
            </>
          )}

          {selectedServices.length > 0 && (
            <div className="info-box" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div style={{ marginBottom: '12px' }}>
                {selectedServices.map(selected => {
                  const service = availableServices.find(s => s.id === selected.serviceId)
                  if (!service) return null
                  // Skip private room in service breakdown - it's shown separately
                  if (service.name.toLowerCase().includes('private room')) return null
                  return (
                    <div key={selected.serviceId} className="info-box-row">
                      <span>{service.name} × {selected.quantity}</span>
                      <span>{service.price * selected.quantity} EGP</span>
                    </div>
                  )
                })}
                {hasPrivateRoomBooking && roomBookingHours > 0 && (
                  <div className="info-box-row" style={{
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '8px'
                  }}>
                    <span>Private Room ({roomBookingHours.toFixed(1)} {roomBookingHours === 1 ? 'hour' : 'hours'})</span>
                    <span>{roomBookingHours * ROOM_HOURLY_RATE} EGP</span>
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)'
              }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '16px' }}>Total Amount:</span>
                <span style={{ fontWeight: '600', fontSize: '20px', color: 'var(--text-primary)' }}>
                  {calculateTotal()} EGP
                </span>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={selectedServices.length === 0}
            >
              Create Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

