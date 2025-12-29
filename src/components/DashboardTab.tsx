import { useState } from 'react'
import { CheckIn, Service, Room, TransactionItem, Booking, Member, Company } from '../types'
import KanbanBoard from './KanbanBoard'

interface DashboardTabProps {
  checkIns: CheckIn[]
  bookings: Booking[]
  transactionItems: TransactionItem[]
  services: Service[]
  rooms: Room[]
  members: Member[]
  companies: Company[]
  onUpdateCheckIn: (checkIn: CheckIn) => void
  onUpdateBooking?: (booking: Booking) => void
}

type TimePeriod = 'day' | 'yesterday' | 'week' | 'month' | 'last-month' | 'specific-month' | 'all'

export default function DashboardTab({ checkIns, bookings, transactionItems, services, rooms, members, companies, onUpdateCheckIn, onUpdateBooking }: DashboardTabProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Generate month options (last 12 months)
  const monthOptions = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    monthOptions.push({ value: `${year}-${month}`, label: monthName })
  }

  return (
    <div>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
            Manage bookings and check-ins
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', color: '#64748b', marginRight: '8px' }}>View:</label>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="day">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="specific-month">Specific Month</option>
            <option value="all">All Deals So Far</option>
          </select>
          {timePeriod === 'specific-month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <KanbanBoard
        checkIns={checkIns}
        bookings={bookings}
        services={services}
        rooms={rooms}
        members={members}
        companies={companies}
        timePeriod={timePeriod}
        selectedMonth={timePeriod === 'specific-month' ? selectedMonth : undefined}
        onUpdateCheckIn={onUpdateCheckIn}
        onUpdateBooking={onUpdateBooking}
      />
    </div>
  )
}
