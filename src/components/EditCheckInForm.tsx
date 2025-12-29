import { useState, useEffect } from 'react'
import { CheckIn, Service } from '../types'

interface EditCheckInFormProps {
  checkIn: CheckIn
  services: Service[]
  onSave: (checkIn: CheckIn) => void
  onCancel: () => void
}

export default function EditCheckInForm({ checkIn, services, onSave, onCancel }: EditCheckInFormProps) {
  const [selectedServices, setSelectedServices] = useState<{ serviceId: string; quantity: number }[]>([])

  // Filter to only show services available for members (one-time)
  const memberServices = services.filter(s => s.availableForMembers && s.type === 'one-time')

  useEffect(() => {
    // Initialize with existing services
    const existing = checkIn.services.map(s => ({
      serviceId: s.serviceId,
      quantity: s.quantity
    }))
    setSelectedServices(existing)
  }, [checkIn])

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
    return selectedServices.reduce((total, selected) => {
      const service = memberServices.find(s => s.id === selected.serviceId)
      return total + (service ? service.price * selected.quantity : 0)
    }, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const checkInServices = selectedServices.map(selected => {
      const service = memberServices.find(s => s.id === selected.serviceId)!
      return {
        serviceId: service.id,
        name: service.name,
        price: service.price,
        quantity: selected.quantity
      }
    })

    const updatedCheckIn: CheckIn = {
      ...checkIn,
      services: checkInServices,
      totalAmount: calculateTotal()
    }

    onSave(updatedCheckIn)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Check-in Services</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Member:</div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#1e293b' }}>{checkIn.memberName}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {new Date(checkIn.dateTime).toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Services</label>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid #cbd5e1', 
              borderRadius: '6px', 
              padding: '12px' 
            }}>
              {memberServices.length === 0 ? (
                <p style={{ color: '#64748b', padding: '8px' }}>No services available.</p>
              ) : (
                memberServices.map(service => {
                  const isSelected = selectedServices.some(s => s.serviceId === service.id)
                  const selectedService = selectedServices.find(s => s.serviceId === service.id)
                  return (
                    <div 
                      key={service.id} 
                      style={{ 
                        padding: '12px', 
                        marginBottom: '8px',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#eff6ff' : 'white',
                        cursor: 'pointer'
                      }}
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
                            <span style={{ fontWeight: '500', color: '#1e293b' }}>
                              {service.name}
                            </span>
                          </div>
                          <div style={{ marginLeft: '28px', fontSize: '14px', color: '#64748b' }}>
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
                              onClick={() => handleQuantityChange(service.id, (selectedService?.quantity || 1) - 1)}
                              style={{
                                width: '28px',
                                height: '28px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: '30px', textAlign: 'center', fontWeight: '500' }}>
                              {selectedService?.quantity || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(service.id, (selectedService?.quantity || 1) + 1)}
                              style={{
                                width: '28px',
                                height: '28px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                background: 'white',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
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

          {selectedServices.length > 0 && (
            <div style={{ 
              marginTop: '20px', 
              padding: '16px', 
              backgroundColor: '#f8fafc', 
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: '500', color: '#1e293b' }}>Total Amount:</span>
                <span style={{ fontWeight: '600', fontSize: '18px', color: '#1e293b' }}>
                  {calculateTotal()} EGP
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                {selectedServices.map(selected => {
                  const service = memberServices.find(s => s.id === selected.serviceId)
                  if (!service) return null
                  return (
                    <div key={selected.serviceId} style={{ marginBottom: '4px' }}>
                      {service.name} × {selected.quantity} = {service.price * selected.quantity} EGP
                    </div>
                  )
                })}
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
            >
              Update Check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

