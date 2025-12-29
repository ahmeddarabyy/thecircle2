import { useState, useEffect } from 'react'
import { Room } from '../types'

interface RoomFormProps {
  room?: Room | null
  branchId: string | null
  onSave: (room: Room) => void
  onCancel: () => void
}

export default function RoomForm({ room, branchId, onSave, onCancel }: RoomFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    capacity: 1
  })

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        capacity: room.capacity
      })
    } else {
      setFormData({
        name: '',
        capacity: 1
      })
    }
  }, [room])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Please enter a room name')
      return
    }

    if (formData.capacity < 1) {
      alert('Capacity must be at least 1')
      return
    }

    if (!branchId) {
      alert('Please select a branch first')
      return
    }

    const roomData: Room = {
      id: room?.id || `room-${Date.now()}`,
      name: formData.name.trim(),
      capacity: formData.capacity,
      branchId: branchId
    }

    onSave(roomData)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{room ? 'Edit Room' : 'Add New Room'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Room Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Conference Room A"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Capacity *</label>
            <input
              type="number"
              className="form-input"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              min="1"
              required
            />
            <small className="form-helper-text">
              Maximum number of people this room can accommodate
            </small>
          </div>

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              {room ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

