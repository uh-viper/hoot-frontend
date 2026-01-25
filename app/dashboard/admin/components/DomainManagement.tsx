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
  const [domain, setDomain] = useState<Domain | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingRoot, setIsUpdatingRoot] = useState(false)
  const [newRootDomain, setNewRootDomain] = useState('')
  const [addingAlias, setAddingAlias] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [removingAlias, setRemovingAlias] = useState<string | null>(null)
  const [aliasesDropdownOpen, setAliasesDropdownOpen] = useState(false)

  // Fetch domain on mount
  useEffect(() => {
    fetchDomain()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (aliasesDropdownOpen && !target.closest('.aliases-dropdown')) {
        setAliasesDropdownOpen(false)
      }
    }

    if (aliasesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [aliasesDropdownOpen])


  const fetchDomain = async () => {
    try {
      const response = await fetch('/api/admin/domains')
      if (!response.ok) throw new Error('Failed to fetch domain')
      const data = await response.json()
      // Get the first (and only) domain
      const domains = data.domains || []
      setDomain(domains[0] || null)
      if (domains[0]) {
        setNewRootDomain(domains[0].domain_name)
      }
    } catch (err) {
      console.error('Error fetching domain:', err)
      showError('Failed to load domain')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetRootDomain = async (e: React.FormEvent) => {
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

    setIsUpdatingRoot(true)
    const updatingToastId = showInfo('Setting root domain...')

    try {
      const method = domain ? 'PATCH' : 'POST'
      const url = domain ? `/api/admin/domains/${domain.id}` : '/api/admin/domains'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain: newRootDomain.trim().toLowerCase(),
          aliases: domain?.aliases || [],
          status: 'active' // Automatically set to active
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set root domain')
      }

      showSuccess('Root domain set successfully')
      fetchDomain()
    } catch (err: any) {
      showError(err.message || 'Failed to set root domain')
    } finally {
      setIsUpdatingRoot(false)
    }
  }

  const handleAddAlias = async () => {
    if (!domain) {
      showError('Please set root domain first')
      return
    }

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

    setAddingAlias(true)
    try {
      const response = await fetch(`/api/admin/domains/${domain.id}/aliases`, {
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
      fetchDomain()
    } catch (err: any) {
      showError(err.message || 'Failed to add alias')
    } finally {
      setAddingAlias(false)
    }
  }

  const handleRemoveAlias = async (alias: string) => {
    if (!domain) return

    setRemovingAlias(alias)
    try {
      const response = await fetch(`/api/admin/domains/${domain.id}/aliases`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove alias')
      }

      showSuccess(`Alias "${alias}" removed successfully`)
      fetchDomain()
    } catch (err: any) {
      showError(err.message || 'Failed to remove alias')
    } finally {
      setRemovingAlias(null)
    }
  }


  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px' }}></div>
        <p>Loading domain settings...</p>
      </div>
    )
  }

  return (
    <div className="domain-management">
      <h3 className="management-section-title">
        <span className="material-icons">domain</span>
        Microsoft Domain Settings
      </h3>
      
      {/* Root Domain Setting with Aliases Dropdown */}
      <div className="domain-add-form">
        <form onSubmit={handleSetRootDomain}>
          <div>
            <label htmlFor="root-domain-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              Microsoft Account
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <input
                  id="root-domain-input"
                  type="text"
                  value={newRootDomain}
                  onChange={(e) => setNewRootDomain(e.target.value)}
                  placeholder="hootserv.onmicrosoft.com"
                  disabled={isUpdatingRoot}
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
                disabled={isUpdatingRoot || !newRootDomain.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isUpdatingRoot ? 'rgba(212, 175, 55, 0.5)' : '#d4af37',
                  color: '#000',
                  fontWeight: 600,
                  cursor: isUpdatingRoot ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
              >
                {isUpdatingRoot ? 'Setting...' : domain ? 'Update' : 'Set'}
              </button>

              {/* Aliases Dropdown */}
              {domain && (
                <>
                  <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '1.25rem', alignSelf: 'center' }}>|</span>
                  <div className="aliases-dropdown" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setAliasesDropdownOpen(!aliasesDropdownOpen)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <span>Aliases ({domain.aliases?.length || 0})</span>
                      <span className="material-icons" style={{ fontSize: '1.25rem' }}>
                        {aliasesDropdownOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  
                  {aliasesDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      background: 'rgba(20, 20, 20, 0.98)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem',
                      minWidth: '300px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                      zIndex: 1000,
                    }}>
                      {/* Existing Aliases */}
                      {domain.aliases && domain.aliases.length > 0 ? (
                        <div style={{ marginBottom: '1rem' }}>
                          {domain.aliases.map((alias) => (
                            <div
                              key={alias}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem',
                                marginBottom: '0.25rem',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.03)',
                              }}
                            >
                              <span style={{ color: '#d4af37', fontSize: '0.875rem' }}>{alias}</span>
                              <button
                                onClick={() => handleRemoveAlias(alias)}
                                disabled={removingAlias === alias}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#f44336',
                                  cursor: removingAlias === alias ? 'not-allowed' : 'pointer',
                                  padding: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                                title="Remove"
                              >
                                <span className="material-icons" style={{ fontSize: '1rem' }}>
                                  close
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '0.5rem', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                          No aliases
                        </div>
                      )}

                      {/* Add Alias Form */}
                      <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <input
                          type="text"
                          value={newAlias}
                          onChange={(e) => setNewAlias(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddAlias()
                            }
                          }}
                          placeholder="Add alias"
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
                          type="button"
                          onClick={handleAddAlias}
                          disabled={addingAlias || !newAlias.trim()}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: (newAlias.trim() && !addingAlias) ? '#d4af37' : 'rgba(212, 175, 55, 0.3)',
                            color: (newAlias.trim() && !addingAlias) ? '#000' : 'rgba(212, 175, 55, 0.5)',
                            fontWeight: 500,
                            cursor: (newAlias.trim() && !addingAlias) ? 'pointer' : 'not-allowed',
                            fontSize: '0.875rem',
                          }}
                        >
                          {addingAlias ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
