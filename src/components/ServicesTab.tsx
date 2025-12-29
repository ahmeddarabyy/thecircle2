import { useState } from 'react'
import { Service, InventoryItem } from '../types'
import ServiceForm from './ServiceForm'
import { createService, updateService } from '../utils/storage'

interface ServicesTabProps {
  services: Service[]
  branchId: string | null
  branches: { id: string; name: string }[]
  inventory: InventoryItem[]
  onUpdateServices: (services: Service[]) => void
}

export default function ServicesTab({ services, branchId, branches, inventory, onUpdateServices }: ServicesTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const handleAdd = () => {
    setEditingService(null)
    setShowForm(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setShowForm(true)
  }

  const handleSave = async (service: Service) => {
    if (editingService) {
      // Update existing service
      await updateService(service)
      const updated = services.map(s => s.id === service.id ? service : s)
      onUpdateServices(updated)
    } else {
      // Add new service
      await createService(service)
      onUpdateServices([...services, service])
    }
    setShowForm(false)
    setEditingService(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingService(null)
  }

  return (
    <>
      <div className="content-header">
        <h1 className="content-title">Services</h1>
        <button className="add-button" onClick={handleAdd}>
          + Add Service
        </button>
      </div>

      {showForm && (
        <ServiceForm
          service={editingService}
          branchId={branchId}
          branches={branches}
          inventory={inventory}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <div className="table-container">
        {services.length === 0 ? (
          <div className="empty-state">
            <p>No services yet. Click "Add Service" to get started.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Price (EGP)</th>
                <th>Available For</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(service => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{service.price === 0 ? 'Contract-based' : `${service.price} EGP`}</td>
                  <td>
                    {service.availableForMembers && service.availableForCompanies
                      ? 'Members & Companies'
                      : service.availableForMembers
                        ? 'Members Only'
                        : 'Companies Only'}
                  </td>
                  <td>
                    <span className={`badge ${service.type === 'contract' ? 'badge-active' : 'badge-inactive'}`}>
                      {service.type === 'contract' ? 'Contract' : 'One-time'}
                    </span>
                  </td>
                  <td>
                    <button className="edit-button" onClick={() => handleEdit(service)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

