'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'

interface Domain {
  id: string
  domain_name: string
  registrar: string
  status: 'pending' | 'active' | 'error'
  cloudflare_zone_id: string | null
  cloudflare_nameservers: string[] | null
  porkbun_nameservers: string[] | null
  dns_records: any[]
  notes: string | null
  created_at: string
  updated_at: string
}

export default function DomainManagement() {
  const { showSuccess, showError, showInfo } = useToast()
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [isConfiguring, setIsConfiguring] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ domainId: string; domainName: string } | null>(null)
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null)

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (openStatusDropdown && !target.closest('.status-dropdown')) {
        setOpenStatusDropdown(null)
      }
    }

    if (openStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openStatusDropdown])

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/admin/domains')
      if (!response.ok) throw new Error('Failed to fetch domains')
      const data = await response.json()
      setDomains(data.domains || [])
    } catch (err) {
      console.error('Error fetching domains:', err)
      showError('Failed to load domains')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) {
      showError('Please enter a domain name')
      return
    }

    setIsAdding(true)
    const addingToastId = showInfo('Adding domain...')

    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      showSuccess('Domain added successfully')
      setNewDomain('')
      fetchDomains()
    } catch (err: any) {
      showError(err.message || 'Failed to add domain')
    } finally {
      setIsAdding(false)
    }
  }

  const handleConfigureDomain = async (domainId: string) => {
    const domain = domains.find(d => d.id === domainId)
    const domainName = domain?.domain_name || 'domain'
    
    // Add to configuring set
    setIsConfiguring(prev => new Set(prev).add(domainId))
    const configuringToastId = showInfo(`Configuring domain ${domainName}...`)

    try {
      const response = await fetch(`/api/admin/domains/${domainId}/configure`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to configure domain')
      }

      showSuccess(`Successfully configured ${domainName}`)
      fetchDomains()
    } catch (err: any) {
      showError(err.message || `Failed to configure ${domainName}`)
    } finally {
      // Remove from configuring set
      setIsConfiguring(prev => {
        const newSet = new Set(prev)
        newSet.delete(domainId)
        return newSet
      })
    }
  }

  const handleDeleteClick = (domainId: string, domainName: string) => {
    setDeleteModal({ domainId, domainName })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return

    const { domainId, domainName } = deleteModal
    setDeleteModal(null)
    setIsDeleting(domainId)
    const deletingToastId = showInfo('Deleting domain...')

    try {
      const response = await fetch(`/api/admin/domains/${domainId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete domain')
      }

      showSuccess(`Domain ${domainName} deleted successfully`)
      fetchDomains()
    } catch (err: any) {
      showError(err.message || 'Failed to delete domain')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal(null)
  }

  // Status Dropdown Menu Component with fixed positioning
  const StatusDropdownMenu = ({ 
    domainId, 
    currentStatus, 
    onStatusChange, 
    isUpdating 
  }: { 
    domainId: string
    currentStatus: 'pending' | 'active'
    onStatusChange: (status: 'pending' | 'active') => void
    isUpdating: boolean
  }) => {
    const [position, setPosition] = useState({ top: 0, left: 0 })

    useEffect(() => {
      const button = document.querySelector(`[data-domain-id="${domainId}"]`) as HTMLElement
      if (button) {
        const rect = button.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX
        })
      }
    }, [domainId])

    return (
      <div 
        className="status-dropdown-menu"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`
        }}
      >
        {currentStatus !== 'pending' && (
          <button
            className="status-dropdown-item"
            onClick={() => onStatusChange('pending')}
            disabled={isUpdating}
          >
            <span className="material-icons" style={{ fontSize: '1rem' }}>schedule</span>
            Pending
          </button>
        )}
        {currentStatus !== 'active' && (
          <button
            className="status-dropdown-item"
            onClick={() => onStatusChange('active')}
            disabled={isUpdating}
          >
            <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span>
            Active
          </button>
        )}
      </div>
    )
  }

  const handleStatusChange = async (domainId: string, newStatus: 'pending' | 'active') => {
    setIsUpdatingStatus(domainId)
    try {
      const response = await fetch(`/api/admin/domains/${domainId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status')
      }

      showSuccess(`Domain status updated to ${newStatus}`)
      fetchDomains()
    } catch (err: any) {
      showError(err.message || 'Failed to update status')
      fetchDomains() // Refresh to revert UI change
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: '#ffa500', label: 'Pending' },
      active: { color: '#4caf50', label: 'Active' },
      error: { color: '#f44336', label: 'Error' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '0.875rem',
          fontWeight: 500,
          backgroundColor: `${config.color}20`,
          color: config.color,
        }}
      >
        {config.label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px' }}></div>
        <p>Loading domains...</p>
      </div>
    )
  }

  return (
    <div className="domain-management">
      <h3 className="management-section-title">
        <span className="material-icons">domain</span>
        Domain Management ({domains.length})
      </h3>
      
      {/* Add Domain Form */}
      <div className="domain-add-form">
        <form onSubmit={handleAddDomain}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="domain-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Domain Name
              </label>
              <input
                id="domain-input"
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                disabled={isAdding}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '1rem',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isAdding || !newDomain.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: isAdding ? 'rgba(212, 175, 55, 0.5)' : '#d4af37',
                color: '#000',
                fontWeight: 600,
                cursor: isAdding ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
              }}
            >
              {isAdding ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </div>

      {/* Domains List */}
      <div className="domain-list" style={{ marginTop: '2rem' }}>
        {domains.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
            <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              domain
            </span>
            <p>No domains added yet</p>
          </div>
        ) : (
          <div className="admin-table-container domain-list-scrollable">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Registrar</th>
                  <th>Cloudflare Zone</th>
                  <th>Nameservers</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr key={domain.id}>
                    <td>
                      <strong>{domain.domain_name || 'N/A'}</strong>
                    </td>
                    <td>
                      <div className="status-dropdown">
                        <button
                          className="status-dropdown-toggle"
                          data-domain-id={domain.id}
                          onClick={() => setOpenStatusDropdown(openStatusDropdown === domain.id ? null : domain.id)}
                          disabled={isUpdatingStatus === domain.id}
                        >
                          {domain.status === 'active' ? 'Active' : 'Pending'}
                          <span className="material-icons" style={{ fontSize: '1rem', marginLeft: '0.5rem' }}>
                            {openStatusDropdown === domain.id ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                        {openStatusDropdown === domain.id && (
                          <StatusDropdownMenu
                            domainId={domain.id}
                            currentStatus={(domain.status === 'pending' || domain.status === 'active') ? domain.status : 'pending'}
                            onStatusChange={(newStatus) => {
                              handleStatusChange(domain.id, newStatus)
                              setOpenStatusDropdown(null)
                            }}
                            isUpdating={isUpdatingStatus === domain.id}
                          />
                        )}
                      </div>
                    </td>
                    <td>{domain.registrar || 'N/A'}</td>
                    <td>
                      {domain.cloudflare_zone_id ? (
                        <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                          {domain.cloudflare_zone_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span style={{ opacity: 0.5 }}>Not configured</span>
                      )}
                    </td>
                    <td>
                      {domain.cloudflare_nameservers && domain.cloudflare_nameservers.length > 0 ? (
                        <div style={{ fontSize: '0.875rem' }}>
                          {domain.cloudflare_nameservers.slice(0, 2).map((ns, i) => (
                            <div key={i}>{ns}</div>
                          ))}
                          {domain.cloudflare_nameservers.length > 2 && (
                            <div style={{ opacity: 0.6, fontSize: '0.75rem' }}>
                              +{domain.cloudflare_nameservers.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>Not set</span>
                      )}
                    </td>
                    <td>{domain.created_at ? formatDate(domain.created_at) : 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleConfigureDomain(domain.id)}
                          disabled={isConfiguring.has(domain.id) || isDeleting === domain.id}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background:
                              isConfiguring.has(domain.id)
                                ? 'rgba(212, 175, 55, 0.5)'
                                : '#d4af37',
                            color: '#000',
                            fontWeight: 500,
                            cursor: isConfiguring.has(domain.id) || isDeleting === domain.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {isConfiguring.has(domain.id) ? (
                            <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', verticalAlign: 'middle' }}></span>
                          ) : (
                            'Configure'
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(domain.id, domain.domain_name)}
                          disabled={isConfiguring.has(domain.id) || isDeleting === domain.id}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isDeleting === domain.id ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.2)',
                            color: '#f44336',
                            fontWeight: 500,
                            cursor: isConfiguring.has(domain.id) || isDeleting === domain.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {isDeleting === domain.id ? (
                            <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', verticalAlign: 'middle' }}></span>
                          ) : (
                            <>
                              <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>
                                delete
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleDeleteCancel}
        >
          <div
            style={{
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <span
                className="material-icons"
                style={{
                  fontSize: '3rem',
                  color: '#f44336',
                  display: 'block',
                  marginBottom: '1rem',
                }}
              >
                warning
              </span>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: '#fff',
                }}
              >
                Delete Domain?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                Are you sure you want to delete <strong style={{ color: '#fff' }}>{deleteModal.domainName}</strong>?
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f44336',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Delete Domain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
