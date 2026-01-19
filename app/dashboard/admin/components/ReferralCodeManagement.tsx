'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'

interface ReferralCode {
  id: string
  code: string
  description: string | null
  is_active: boolean
  free_credits: number
  usage_count: number
  created_at: string
  updated_at: string
}

export default function ReferralCodeManagement() {
  const { showSuccess, showError, showInfo } = useToast()
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newFreeCredits, setNewFreeCredits] = useState('0')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const [isEditingCredits, setIsEditingCredits] = useState<string | null>(null)
  const [editingCreditsValue, setEditingCreditsValue] = useState('')
  const [deleteModal, setDeleteModal] = useState<{ codeId: string; code: string } | null>(null)

  // Fetch referral codes on mount
  useEffect(() => {
    fetchReferralCodes()
  }, [])

  const fetchReferralCodes = async () => {
    try {
      const response = await fetch('/api/admin/referral-codes')
      if (!response.ok) throw new Error('Failed to fetch referral codes')
      const data = await response.json()
      setReferralCodes(data.referralCodes || [])
    } catch (err) {
      console.error('Error fetching referral codes:', err)
      showError('Failed to load referral codes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode.trim()) {
      showError('Please enter a referral code')
      return
    }

    setIsAdding(true)
    showInfo('Adding referral code...')

    try {
      const freeCreditsNum = parseInt(newFreeCredits) || 0
      if (freeCreditsNum < 0 || freeCreditsNum > 1000000) {
        showError('Free credits must be between 0 and 1,000,000')
        setIsAdding(false)
        return
      }

      const response = await fetch('/api/admin/referral-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: newCode.trim(),
          description: newDescription.trim() || null,
          free_credits: freeCreditsNum,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add referral code')
      }

      showSuccess('Referral code added successfully')
      setNewCode('')
      setNewDescription('')
      setNewFreeCredits('0')
      fetchReferralCodes()
    } catch (err: any) {
      showError(err.message || 'Failed to add referral code')
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggleActive = async (codeId: string, currentActive: boolean) => {
    setIsToggling(codeId)
    try {
      const response = await fetch(`/api/admin/referral-codes/${codeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update referral code')
      }

      showSuccess(`Referral code ${!currentActive ? 'activated' : 'deactivated'}`)
      fetchReferralCodes()
    } catch (err: any) {
      showError(err.message || 'Failed to update referral code')
    } finally {
      setIsToggling(null)
    }
  }

  const handleEditCredits = (codeId: string, currentCredits: number) => {
    setIsEditingCredits(codeId)
    setEditingCreditsValue(currentCredits.toString())
  }

  const handleSaveCredits = async (codeId: string) => {
    const creditsNum = parseInt(editingCreditsValue) || 0
    if (creditsNum < 0 || creditsNum > 1000000) {
      showError('Free credits must be between 0 and 1,000,000')
      return
    }

    try {
      const response = await fetch(`/api/admin/referral-codes/${codeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ free_credits: creditsNum }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update free credits')
      }

      showSuccess('Free credits updated successfully')
      setIsEditingCredits(null)
      setEditingCreditsValue('')
      fetchReferralCodes()
    } catch (err: any) {
      showError(err.message || 'Failed to update free credits')
    }
  }

  const handleCancelEditCredits = () => {
    setIsEditingCredits(null)
    setEditingCreditsValue('')
  }

  const handleDeleteClick = (codeId: string, code: string) => {
    setDeleteModal({ codeId, code })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return

    const { codeId, code } = deleteModal
    setDeleteModal(null)
    setIsDeleting(codeId)
    showInfo('Deleting referral code...')

    try {
      const response = await fetch(`/api/admin/referral-codes/${codeId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete referral code')
      }

      showSuccess(`Referral code ${code} deleted successfully`)
      fetchReferralCodes()
    } catch (err: any) {
      showError(err.message || 'Failed to delete referral code')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px' }}></div>
        <p>Loading referral codes...</p>
      </div>
    )
  }

  return (
    <div className="referral-code-management">
      <h3 className="management-section-title">
        <span className="material-icons">card_giftcard</span>
        Referral Codes ({referralCodes.length})
      </h3>
      
      {/* Add Referral Code Form */}
      <div className="domain-add-form">
        <form onSubmit={handleAddCode}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label htmlFor="referral-code-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Referral Code
              </label>
              <input
                id="referral-code-input"
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="CODE10"
                disabled={isAdding}
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                }}
              />
            </div>
            <div style={{ flex: '2', minWidth: '200px' }}>
              <label htmlFor="referral-description-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Description (optional)
              </label>
              <input
                id="referral-description-input"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description..."
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
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="referral-credits-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Free Credits
              </label>
              <input
                id="referral-credits-input"
                type="number"
                value={newFreeCredits}
                onChange={(e) => setNewFreeCredits(e.target.value)}
                placeholder="0"
                disabled={isAdding}
                min="0"
                max="1000000"
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
              disabled={isAdding || !newCode.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: isAdding ? 'rgba(212, 175, 55, 0.5)' : '#d4af37',
                color: '#000',
                fontWeight: 600,
                cursor: isAdding ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                whiteSpace: 'nowrap',
              }}
            >
              {isAdding ? 'Adding...' : 'Add Code'}
            </button>
          </div>
        </form>
      </div>

      {/* Referral Codes List */}
      <div className="domain-list" style={{ marginTop: '2rem' }}>
        {referralCodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
            <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              card_giftcard
            </span>
            <p>No referral codes created yet</p>
          </div>
        ) : (
          <div className="admin-table-container domain-list-scrollable">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Free Credits</th>
                  <th>Status</th>
                  <th>Usage</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {referralCodes.map((code) => (
                  <tr key={code.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{code.code}</strong>
                    </td>
                    <td style={{ opacity: code.description ? 1 : 0.5 }}>
                      {code.description || 'No description'}
                    </td>
                    <td>
                      {isEditingCredits === code.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={editingCreditsValue}
                            onChange={(e) => setEditingCreditsValue(e.target.value)}
                            min="0"
                            max="1000000"
                            style={{
                              width: '80px',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              fontSize: '0.875rem',
                            }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveCredits(code.id)
                              } else if (e.key === 'Escape') {
                                handleCancelEditCredits()
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSaveCredits(code.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#4caf50',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEditCredits}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: 'rgba(158, 158, 158, 0.3)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{code.free_credits || 0}</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          backgroundColor: code.is_active ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                          color: code.is_active ? '#4caf50' : '#9e9e9e',
                        }}
                      >
                        {code.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{code.usage_count}</span>
                      <span style={{ opacity: 0.6 }}> users</span>
                    </td>
                    <td>{formatDate(code.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleToggleActive(code.id, code.is_active)}
                          disabled={isToggling === code.id || isDeleting === code.id || isEditingCredits !== null}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: code.is_active 
                              ? 'rgba(158, 158, 158, 0.2)' 
                              : 'rgba(76, 175, 80, 0.2)',
                            color: code.is_active ? '#9e9e9e' : '#4caf50',
                            fontWeight: 500,
                            cursor: isToggling === code.id || isDeleting === code.id || isEditingCredits !== null ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {isToggling === code.id ? (
                            <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', verticalAlign: 'middle' }}></span>
                          ) : code.is_active ? (
                            'Deactivate'
                          ) : (
                            'Activate'
                          )}
                        </button>
                        <button
                          onClick={() => handleEditCredits(code.id, code.free_credits || 0)}
                          disabled={isToggling === code.id || isDeleting === code.id || isEditingCredits !== null}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isEditingCredits === code.id ? 'rgba(212, 175, 55, 0.5)' : 'rgba(212, 175, 55, 0.2)',
                            color: '#d4af37',
                            fontWeight: 500,
                            cursor: isToggling === code.id || isDeleting === code.id || isEditingCredits !== null ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                          title="Edit free credits"
                        >
                          <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(code.id, code.code)}
                          disabled={isToggling === code.id || isDeleting === code.id || isEditingCredits !== null}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isDeleting === code.id ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.2)',
                            color: '#f44336',
                            fontWeight: 500,
                            cursor: isToggling === code.id || isDeleting === code.id || isEditingCredits !== null ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          {isDeleting === code.id ? (
                            <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', verticalAlign: 'middle' }}></span>
                          ) : (
                            <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>
                              delete
                            </span>
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
                Delete Referral Code?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                Are you sure you want to delete <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{deleteModal.code}</strong>?
                This action cannot be undone. Users who signed up with this code will keep their records.
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
                Delete Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
