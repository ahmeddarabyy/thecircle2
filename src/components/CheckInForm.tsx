import { useState, useEffect } from 'react'
import { Member, Service, CheckIn, Room, InventoryItem } from '../types'
import React from 'react'

interface CheckInFormProps {
  members: Member[]
  services: Service[]
  rooms: Room[]
  checkIns: CheckIn[] // Existing check-ins to check for conflicts
  inventory: InventoryItem[]
  branchId: string | null
  preSelectedMemberId?: string | null
  onSave: (checkIn: CheckIn) => void
  onCancel: () => void
}

export default function CheckInForm({ members, services, rooms, checkIns, inventory, branchId, preSelectedMemberId, onSave, onCancel }: CheckInFormProps) {
  const [selectedMemberId, setSelectedMemberId] = useState(preSelectedMemberId || '')
  const [selectedServices, setSelectedServices] = useState<{ serviceId: string; quantity: number }[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [roomStartTime, setRoomStartTime] = useState('12:00 AM')
  const [roomEndTime, setRoomEndTime] = useState('12:00 AM')

  // Filter to only show individual members (not company members) and services available for members
  const individualMembers = members.filter(m => !m.companyId)
  const memberServices = services.filter(s => s.availableForMembers && s.type === 'one-time')

  // Check if private room booking service is selected
  const hasPrivateRoomBooking = selectedServices.some(selected => {
    const service = memberServices.find(s => s.id === selected.serviceId)
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

  // Check for room booking conflicts
  const checkRoomConflict = (roomId: string, startTime24: string, endTime24: string): boolean => {
    if (!roomId || !startTime24 || !endTime24) return false

    const today = new Date().toISOString().split('T')[0]
    const bookingStart = new Date(`${today}T${startTime24}`)
    const bookingEnd = new Date(`${today}T${endTime24}`)

    // Check all existing check-ins for conflicts
    return checkIns.some(existing => {
      // Only check bookings/check-ins that have the same room
      if (!existing.roomId || existing.roomId !== roomId) return false

      // Get the date for the existing booking/check-in
      const existingDate = existing.bookingDateTime
        ? new Date(existing.bookingDateTime).toISOString().split('T')[0]
        : new Date(existing.dateTime).toISOString().split('T')[0]

      // Only check if it's the same date (today for check-ins)
      if (existingDate !== today) return false

      // Get the time slot for existing booking
      if (!existing.roomBookingStartTime || !existing.roomBookingEndTime) return false

      const existingStart = new Date(`${existingDate}T${existing.roomBookingStartTime}`)
      const existingEnd = new Date(`${existingDate}T${existing.roomBookingEndTime}`)

      // Check for overlap: new booking overlaps if it starts before existing ends AND ends after existing starts
      return bookingStart < existingEnd && bookingEnd > existingStart
    })
  }

  // Filter members based on search query
  const filteredMembers = individualMembers.filter(member => {
    if (!memberSearchQuery.trim()) return true

    const query = memberSearchQuery.toLowerCase()
    return (
      member.fullName.toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query) ||
      (member.phoneNumber || '').includes(query) ||
      (member.occupation || '').toLowerCase().includes(query)
    )
  })

  // Update selected member if preSelectedMemberId changes
  useEffect(() => {
    if (preSelectedMemberId) {
      setSelectedMemberId(preSelectedMemberId)
    }
  }, [preSelectedMemberId])

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
      const service = memberServices.find(s => s.id === selected.serviceId)
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
    if (!selectedMemberId) return

    const selectedMember = individualMembers.find(m => m.id === selectedMemberId)
    if (!selectedMember) return

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

    // Check for room conflicts
    if (hasPrivateRoomBooking) {
      const startTime24 = convertTo24Hour(roomStartTime)
      const endTime24 = convertTo24Hour(roomEndTime)
      if (checkRoomConflict(selectedRoomId, startTime24, endTime24)) {
        const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'selected room'
        alert(`This room (${roomName}) is already booked for the selected time slot. Please choose a different time or room.`)
        return
      }
    }

    const checkInServices = selectedServices.map(selected => {
      const service = memberServices.find(s => s.id === selected.serviceId)!
      // For private room booking, update the price based on hours
      if (service.name.toLowerCase().includes('private room') && hasPrivateRoomBooking) {
        return {
          serviceId: service.id,
          name: `${service.name} (${roomBookingHours} ${roomBookingHours === 1 ? 'hour' : 'hours'})`,
          price: ROOM_HOURLY_RATE,
          quantity: roomBookingHours,
          paymentStatus: 'unpaid' as const
        }
      }
      return {
        serviceId: service.id,
        name: service.name,
        price: service.price,
        quantity: selected.quantity,
        paymentStatus: 'unpaid' as const
      }
    })

    // Track inventory items sold
    const inventoryItemsSold: { itemId: string; itemName: string; quantity: number }[] = []
    selectedServices.forEach(selected => {
      const service = memberServices.find(s => s.id === selected.serviceId)
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

    if (!branchId) {
      alert('Please select a branch first')
      return
    }

    const checkIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      // Use both legacy and new field names for compatibility
      memberId: selectedMemberId,
      memberName: selectedMember.fullName,
      // CRITICAL: Always set new visitor fields
      visitorId: selectedMemberId,
      visitorName: selectedMember.fullName,
      visitorType: 'member',
      dateTime: new Date().toISOString(),
      checkInTime: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      services: checkInServices,
      totalAmount: calculateTotal(),
      paidAmount: 0,
      paymentStatus: 'unpaid',
      status: 'checked-in',
      roomId: hasPrivateRoomBooking ? selectedRoomId : undefined,
      isCompany: false,
      roomBookingStartTime: hasPrivateRoomBooking ? convertTo24Hour(roomStartTime) : undefined,
      roomBookingEndTime: hasPrivateRoomBooking ? convertTo24Hour(roomEndTime) : undefined,
      roomBookingHours: hasPrivateRoomBooking ? roomBookingHours : undefined,
      branchId: branchId,
      inventoryItems: inventoryItemsSold.length > 0 ? inventoryItemsSold : undefined
    }

    onSave(checkIn)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Check in a Member</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Member *</label>
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="form-input"
              style={{ marginBottom: '12px' }}
            />
            <div className="selection-list">
              {individualMembers.length === 0 ? (
                <p className="form-helper-text" style={{ padding: '8px' }}>No individual members available. Please add members first.</p>
              ) : filteredMembers.length === 0 ? (
                <p className="form-helper-text" style={{ padding: '8px' }}>No members found matching "{memberSearchQuery}"</p>
              ) : (
                filteredMembers.map(member => (
                  <label
                    key={member.id}
                    className={`selection-card ${selectedMemberId === member.id ? 'selected' : ''}`}
                    onMouseEnter={(e) => {
                      if (selectedMemberId !== member.id) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedMemberId !== member.id) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="member"
                      checked={selectedMemberId === member.id}
                      onChange={() => setSelectedMemberId(member.id)}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                      {member.fullName}
                    </span>
                    {member.email && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginLeft: '8px' }}>
                        ({member.email})
                      </span>
                    )}
                    {member.phoneNumber && (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>
                        • {member.phoneNumber}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            {individualMembers.length > 0 && (
              <div className="form-helper-text">
                Showing {filteredMembers.length} of {individualMembers.length} available members
              </div>
            )}
            {!selectedMemberId && (
              <small style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Please select a member to continue
              </small>
            )}
          </div>

          {selectedMemberId && (
            <div className="form-group">
              <label className="form-label">Select Services</label>
              <div className="selection-list" style={{ maxHeight: '300px' }}>
                {memberServices.length === 0 ? (
                  <p className="form-helper-text" style={{ padding: '8px' }}>No services available for members.</p>
                ) : (
                  memberServices.map(service => {
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
          )}

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
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'})
                    </option>
                  ))}
                </select>
              </div>

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
                  </div>
                )}
              </div>
            </>
          )}

          {selectedServices.length > 0 && (
            <div className="info-box" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div style={{ marginBottom: '12px' }}>
                {selectedServices.map(selected => {
                  const service = memberServices.find(s => s.id === selected.serviceId)
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
              disabled={!selectedMemberId}
            >
              Check In Member
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

