'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'

interface Domain {
  id: string
  domain_name: string // Root domain like "hootserv.onmicrosoft.com"
  aliases: string[] // Aliases like ["hoot", "autn"]
  status: 'pending' | 'active' | 'error'
  created_at: string
  updated_at: string
}

export default function DomainManagement() {
  const { showSuccess, showError, showInfo } = useToast()
  const [domains, setDomains] = useState<Domain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newRootDomain, setNewRootDomain] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ domainId: string; domainName: string } | null>(null)
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null)
  const [addingAlias, setAddingAlias] = useState<string | null>(null)
  const [newAlias, setNewAlias] = useState('')
  const [removingAlias, setRemovingAlias] = useState<string | null>(null)

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

  const handleAddRootDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRootDomain.trim()) {
      showError('Please enter a root domain')
      return
    }

    // Validate .onmicrosoft.com format
    const domainRegex = /^[a-z0-9]+(-[a-z0-9]+)*\.onmicrosoft\.com$/i
    if (!domainRegex.test(newRootDomain.trim())) {
      showError('Domain must be in format: example.onmicrosoft.com')
      return
    }

    setIsAdding(true)
    const addingToastId = showInfo('Adding root domain...')

    try {
      const response = await fetch('/api/admin/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain: newRootDomain.trim().toLowerCase(),
          aliases: [] // Start with empty aliases
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add domain')
      }

      showSuccess('Root domain added successfully')
      setNewRootDomain('')
      fetchDomains()
    } catch (err: any) {
      showError(err.message || 'Failed to add domain')
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddAlias = async (domainId: string) => {
    if (!newAlias.trim()) {
      showError('Please enter an alias')
      return
    }

    // Validate alias format (alphanumeric, hyphens, underscores)
    const aliasRegex = /^[a-z0-9_-]+$/i
    if (!aliasRegex.test(newAlias.trim())) {
      showError('Alias can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setAddingAlias(domainId)
    try {
      const response = await fetch(`/api/admin/domains/${domainId}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: newAlias.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add alias')
      }

      showSuccess(`Alias "${newAlias.trim()}" added successfully`)
      setNewAlias('')
      setAddingAlias(null)
      fetchDomains()
    } catch (err: any) {
      showError(err.message || 'Failed to add alias')
      setAddingAlias(null)
    }
  }

  const handleRemoveAlias = async (domainId: string, alias: string) => {
    setRemovingAlias(`${domainId}-${alias}`)
    try {
      const response = await fetch(`/api/admin/domains/${domainId}/aliases`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove alias')
      }

      showSuccess(`Alias "${alias}" removed successfully`)
      fetchDomains()
    } catch (err: any) {
      showError(err.message || 'Failed to remove alias')
    } finally {
      setRemovingAlias(null)
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

  // Status Dropdown Menu Component
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
    return (
      <div className="status-dropdown-menu">
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
        Microsoft Domain Management ({domains.length})
      </h3>
      
      {/* Add Root Domain Form */}
      <div className="domain-add-form">
        <form onSubmit={handleAddRootDomain}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="domain-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Root Domain (e.g., hootserv.onmicrosoft.com)
              </label>
              <input
                id="domain-input"
                type="text"
                value={newRootDomain}
                onChange={(e) => setNewRootDomain(e.target.value)}
                placeholder="hootserv.onmicrosoft.com"
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
              disabled={isAdding || !newRootDomain.trim()}
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
              {isAdding ? 'Adding...' : 'Add Root Domain'}
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
            {domains.map((domain) => (
              <div
                key={domain.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                }}
              >
                {/* Domain Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{domain.domain_name}</strong>
                      <div className="status-dropdown">
                        <button
                          className="status-dropdown-toggle"
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
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '0.25rem' }}>
                      Root domain passed to backend API: <code style={{ color: '#d4af37' }}>{domain.domain_name}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(domain.id, domain.domain_name)}
                    disabled={isDeleting === domain.id}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: isDeleting === domain.id ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.2)',
                      color: '#f44336',
                      fontWeight: 500,
                      cursor: isDeleting === domain.id ? 'not-allowed' : 'pointer',
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

                {/* Aliases Section */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', margin: 0 }}>
                      Aliases ({domain.aliases?.length || 0})
                    </h4>
                  </div>
                  
                  {/* Existing Aliases */}
                  {domain.aliases && domain.aliases.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                      {domain.aliases.map((alias) => (
                        <div
                          key={alias}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                          }}
                        >
                          <code style={{ color: '#d4af37' }}>{alias}@{domain.domain_name}</code>
                          <button
                            onClick={() => handleRemoveAlias(domain.id, alias)}
                            disabled={removingAlias === `${domain.id}-${alias}`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f44336',
                              cursor: removingAlias === `${domain.id}-${alias}` ? 'not-allowed' : 'pointer',
                              padding: '0.25rem',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Remove alias"
                          >
                            <span className="material-icons" style={{ fontSize: '1rem' }}>
                              close
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Alias Form */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={addingAlias === domain.id ? newAlias : ''}
                      onChange={(e) => {
                        setNewAlias(e.target.value)
                        setAddingAlias(domain.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddAlias(domain.id)
                        }
                        if (e.key === 'Escape') {
                          setAddingAlias(null)
                          setNewAlias('')
                        }
                      }}
                      placeholder="Enter alias (e.g., hoot, autn)"
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        fontSize: '0.875rem',
                      }}
                    />
                    <button
                      onClick={() => handleAddAlias(domain.id)}
                      disabled={addingAlias !== domain.id || !newAlias.trim() || addingAlias === domain.id && removingAlias !== null}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: (addingAlias === domain.id && newAlias.trim()) ? '#d4af37' : 'rgba(212, 175, 55, 0.3)',
                        color: (addingAlias === domain.id && newAlias.trim()) ? '#000' : 'rgba(212, 175, 55, 0.5)',
                        fontWeight: 500,
                        cursor: (addingAlias === domain.id && newAlias.trim()) ? 'pointer' : 'not-allowed',
                        fontSize: '0.875rem',
                      }}
                    >
                      {addingAlias === domain.id && removingAlias === `${domain.id}-${newAlias}` ? (
                        <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px' }}></span>
                      ) : (
                        'Add Alias'
                      )}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem' }}>
                    Accounts will be created as: <code style={{ color: '#d4af37' }}>{domain.aliases?.[0] || 'alias'}+random_id@{domain.domain_name}</code>
                  </div>
                </div>
              </div>
            ))}
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
                This will also delete all associated aliases. This action cannot be undone.
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
