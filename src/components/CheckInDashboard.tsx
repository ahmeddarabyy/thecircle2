import { CheckIn } from '../types'

interface CheckInDashboardProps {
  checkIns: CheckIn[]
  onEdit?: (checkIn: CheckIn) => void
}

export default function CheckInDashboard({ checkIns, onEdit }: CheckInDashboardProps) {
  // Get today's check-ins
  const today = new Date().toDateString()
  const todayCheckIns = checkIns.filter(checkIn => {
    const checkInDate = new Date(checkIn.dateTime).toDateString()
    return checkInDate === today
  })

  // Sort by most recent first
  const sortedCheckIns = [...todayCheckIns].sort((a, b) => 
    new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>
          Today's Check-ins
        </h2>
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: '#eff6ff', 
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#1e40af'
        }}>
          {todayCheckIns.length} {todayCheckIns.length === 1 ? 'member' : 'members'} checked in
        </div>
      </div>

      {sortedCheckIns.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px', 
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ color: '#64748b', fontSize: '16px' }}>
            No check-ins today yet
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gap: '16px'
        }}>
          {sortedCheckIns.map(checkIn => (
            <div 
              key={checkIn.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#1e293b',
                    marginBottom: '4px'
                  }}>
                    {checkIn.memberName}
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#64748b'
                  }}>
                    {formatDate(checkIn.dateTime)} at {formatTime(checkIn.dateTime)}
                  </p>
                </div>
                <div style={{ 
                  textAlign: 'right'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    color: '#1e293b'
                  }}>
                    {checkIn.totalAmount} EGP
                  </div>
                </div>
              </div>

              {checkIn.services.length > 0 && (
                <div style={{ 
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#475569',
                    marginBottom: '8px'
                  }}>
                    Services:
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px'
                  }}>
                    {checkIn.services.map((service, index) => (
                      <span 
                        key={index}
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '12px',
                          fontSize: '13px',
                          color: '#475569'
                        }}
                      >
                        {service.name}
                        {service.quantity > 1 && ` × ${service.quantity}`}
                        <span style={{ marginLeft: '6px', fontWeight: '500' }}>
                          ({service.price * service.quantity} EGP)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {onEdit && (
                <div style={{ 
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => onEdit(checkIn)}
                    className="edit-button"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    Edit Services
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

