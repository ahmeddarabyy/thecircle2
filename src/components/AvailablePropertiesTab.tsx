import { useState } from 'react'
import { Room } from '../types'
import RoomForm from './RoomForm'
import { createRoom, updateRoom, deleteRoom } from '../utils/storage'

interface AvailablePropertiesTabProps {
  rooms: Room[]
  onUpdateRooms: (rooms: Room[]) => void
  branchId: string | null
}

export default function AvailablePropertiesTab({ rooms, onUpdateRooms, branchId }: AvailablePropertiesTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const handleAdd = () => {
    setEditingRoom(null)
    setShowForm(true)
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setShowForm(true)
  }

  const handleSave = async (room: Room) => {
    if (editingRoom) {
      // Update existing room
      await updateRoom(room)
      const updated = rooms.map(r => r.id === room.id ? room : r)
      onUpdateRooms(updated)
    } else {
      // Add new room
      await createRoom(room)
      onUpdateRooms([...rooms, room])
    }
    setShowForm(false)
    setEditingRoom(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRoom(null)
  }

  const handleDelete = async (room: Room) => {
    if (window.confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`)) {
      await deleteRoom(room.id)
      const updated = rooms.filter(r => r.id !== room.id)
      onUpdateRooms(updated)
    }
  }

  return (
    <>
      {showForm && (
        <RoomForm
          room={editingRoom}
          branchId={branchId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b' }}>
              Available Properties
            </h1>
            <p style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>
              Manage available rooms and their capacities
            </p>
          </div>
          <button className="button button-primary" onClick={handleAdd}>
            + Add Room
          </button>
        </div>

        <div className="table-container">
          {rooms.length === 0 ? (
            <div className="empty-state">
              <p>No rooms configured yet.</p>
              <button className="button button-primary" onClick={handleAdd} style={{ marginTop: '16px' }}>
                Add Your First Room
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.id}>
                    <td style={{ fontWeight: '500', color: '#1e293b' }}>{room.name}</td>
                    <td>{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</td>
                    <td>
                      <span className="badge badge-active">Available</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="button button-secondary"
                          onClick={() => handleEdit(room)}
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        <button
                          className="button button-secondary"
                          onClick={() => handleDelete(room)}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            borderColor: '#dc2626'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#b91c1c'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

