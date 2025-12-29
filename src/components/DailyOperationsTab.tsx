import { useState, useEffect } from 'react'
import {
  Member, Company, Service, CheckIn, Room, InventoryItem,
  User as UserType, Booking, RoomReservation
} from '../types'
import CheckInForm from './CheckInForm'
import BookingForm from './BookingForm'
import { CheckSquare, Calendar, Search, Building2, User, Mail, Phone, Contact } from 'lucide-react'
import { createBooking, createRoomReservation } from '../utils/storage'

interface DailyOperationsTabProps {
  members: Member[]
  companies: Company[]
  services: Service[]
  rooms: Room[]
  checkIns: CheckIn[]
  bookings: Booking[]
  roomReservations: RoomReservation[]
  inventory: InventoryItem[]
  branchId: string | null
  user: UserType | null
  onCheckIn: (checkIn: CheckIn) => void
  onBooking: (booking: Booking) => void
}

export default function DailyOperationsTab({
  members, companies, services, rooms, checkIns, bookings,
  roomReservations, inventory, branchId, user, onCheckIn, onBooking
}: DailyOperationsTabProps) {
  const [showCheckInForm, setShowCheckInForm] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [preSelectedMemberId, setPreSelectedMemberId] = useState<string | null>(null)
  const [preSelectedCompanyId, setPreSelectedCompanyId] = useState<string | null>(null)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    if (!user) return
    const firstName = user.fullName.split(' ')[0]
    const messages = [
      `${firstName}, how can I help you today?`,
      `${firstName}, what's your next step?`,
      `Hi ${firstName}, start here!`,
      `Welcome back, ${firstName}. Ready to roll?`,
      `${firstName}, let's make things happen!`,
      `Good to see you, ${firstName}. What's on the agenda?`
    ]
    setGreeting(messages[Math.floor(Math.random() * messages.length)])
  }, [user])

  const handleCheckIn = async (checkIn: CheckIn) => {
    // Note: V2 Bookings/Reservations now handled centrally in App.tsx

    // 2. If room is booked, its metadata is passed in the checkIn object
    // and handled by App.tsx V2 logic.

    // Call upstream (LEGACY support for Kanban etc.)
    onCheckIn(checkIn)
    setShowCheckInForm(false)
    setSearchQuery('')
    setPreSelectedMemberId(null)
  }

  const handleBooking = async (booking: Booking) => {
    // Note: V2 Bookings/Reservations now handled centrally in App.tsx

    // 2. Room reservation handled by App.tsx

    onBooking(booking)
    setShowBookingForm(false)
    setSearchQuery('')
    setPreSelectedMemberId(null)
    setPreSelectedCompanyId(null)
  }

  const filteredMembers = members.filter(member => {
    if (!searchQuery.trim()) return false
    const query = searchQuery.toLowerCase()
    return member.fullName.toLowerCase().includes(query) || member.email.toLowerCase().includes(query) || member.phoneNumber.includes(query)
  })

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery.trim()) return false
    const query = searchQuery.toLowerCase()
    return company.companyName.toLowerCase().includes(query) || company.companyEmail.toLowerCase().includes(query) || company.companyPhoneNumber.includes(query)
  })

  return (
    <>
      {showCheckInForm && (
        <CheckInForm
          members={members}
          services={services}
          rooms={rooms}
          checkIns={checkIns}
          inventory={inventory}
          branchId={branchId}
          preSelectedMemberId={preSelectedMemberId}
          onSave={handleCheckIn}
          onCancel={() => { setShowCheckInForm(false); setPreSelectedMemberId(null); }}
        />
      )}

      {showBookingForm && (
        <BookingForm
          members={members}
          companies={companies}
          services={services}
          rooms={branchId ? rooms.filter(r => r.branchId === branchId) : []}
          checkIns={checkIns}
          bookings={bookings}
          inventory={inventory}
          branchId={branchId}
          preSelectedMemberId={preSelectedMemberId}
          preSelectedCompanyId={preSelectedCompanyId}
          onSave={handleBooking}
          onCancel={() => { setShowBookingForm(false); setPreSelectedMemberId(null); setPreSelectedCompanyId(null); }}
        />
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            {greeting || 'How can I help you today?'}
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
            Search for a member or company, or select an option below
          </p>
        </div>

        <div style={{ marginBottom: '40px', position: 'relative' }}>
          <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search members or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '15px' }}
            />
          </div>
        </div>

        {(filteredMembers.length > 0 || filteredCompanies.length > 0) && (
          <div style={{ marginBottom: '32px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-color)' }}>
            {filteredMembers.length > 0 && (
              <div style={{ marginBottom: filteredCompanies.length > 0 ? '24px' : '0' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredMembers.map(member => (
                    <div key={member.id} className="selection-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={16} /> {member.fullName}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {member.email}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {member.phoneNumber}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="button button-primary" onClick={() => handleMemberClick(member.id)} style={{ fontSize: '13px', padding: '6px 12px' }}>Check In</button>
                        <button className="button button-secondary" onClick={() => handleMemberBookingClick(member.id)} style={{ fontSize: '13px', padding: '6px 12px' }}>Book</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredCompanies.length > 0 && (
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Companies</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredCompanies.map(company => (
                    <div key={company.id} className="selection-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
                      <div>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={16} /> {company.companyName}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {company.companyEmail}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {company.companyPhoneNumber}</span>
                        </div>
                      </div>
                      <button className="button button-secondary" onClick={() => handleCompanyClick(company.id)} style={{ fontSize: '13px', padding: '6px 12px' }}>Book</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="card" style={{ padding: '32px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }} onClick={() => setShowCheckInForm(true)}>
            <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              <CheckSquare size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Check in a member</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Register a member's entry into the coworking space</p>
            </div>
          </div>

          <div className="card" style={{ padding: '32px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }} onClick={() => setShowBookingForm(true)}>
            <div style={{ width: '64px', height: '64px', borderRadius: '32px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              <Calendar size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Create a booking</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Book a service or room for a member or company</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  function handleMemberClick(id: string) { setPreSelectedMemberId(id); setShowCheckInForm(true); setSearchQuery(''); }
  function handleCompanyClick(id: string) { setPreSelectedCompanyId(id); setShowBookingForm(true); setSearchQuery(''); }
  function handleMemberBookingClick(id: string) { setPreSelectedMemberId(id); setShowBookingForm(true); setSearchQuery(''); }
}
