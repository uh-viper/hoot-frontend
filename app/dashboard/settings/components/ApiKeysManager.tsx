"use client";

import { useState, useEffect } from 'react'
import { useToast } from '../../../contexts/ToastContext'

interface ApiKey {
  id: string
  key_name: string
  last_used_at: string | null
  created_at: string
}

interface ApiKeysManagerProps {}

export default function ApiKeysManager({}: ApiKeysManagerProps) {
  const { showSuccess, showError } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ id: string; key_name: string; api_key: string; created_at: string } | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)

  // Fetch API keys on mount
  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/api-keys')
      const data = await response.json()

      if (response.ok) {
        setKeys(data.keys || [])
      } else {
        showError(data.error || 'Failed to fetch API keys')
      }
    } catch (error) {
      console.error('Error fetching API keys:', error)
      showError('Failed to fetch API keys')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateKey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      showError('Please enter a key name')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key_name: newKeyName.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setNewlyCreatedKey(data.key)
        setShowNewKey(true)
        setNewKeyName('')
        showSuccess(hasExistingKey 
          ? 'API key regenerated successfully! Copy the new key now - you won\'t be able to see it again. Your old key has been deleted.'
          : 'API key created successfully! Copy it now - you won\'t be able to see it again.')
        await fetchKeys() // Refresh list
      } else {
        showError(data.error || 'Failed to create API key')
      }
    } catch (error) {
      console.error('Error creating API key:', error)
      showError('Failed to create API key')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showSuccess('API key deleted successfully')
        await fetchKeys() // Refresh list
      } else {
        showError(data.error || 'Failed to delete API key')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      showError('Failed to delete API key')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess('Copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy:', error)
      showError('Failed to copy to clipboard')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasExistingKey = keys.length > 0
  const existingKey = keys[0] // Only one key allowed

  return (
    <div className="settings-api-content">
      {/* Key Creation/Regeneration Form */}
      <form onSubmit={handleCreateKey} className="settings-form" style={{ width: '100%' }}>
        <div className="settings-form-field">
          <label htmlFor="key_name" className="settings-label">
            {hasExistingKey ? 'Regenerate API Key' : 'Create API Key'}
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <input
              type="text"
              id="key_name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="settings-input"
              placeholder={hasExistingKey ? existingKey.key_name : "e.g., Production API, Test Integration"}
              disabled={isCreating}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={isCreating || !newKeyName.trim()}
              className="settings-submit-btn"
              style={{ width: 'auto', minWidth: '140px' }}
            >
              {isCreating ? (
                <>
                  <span className="material-icons spinning">sync</span>
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <span className="material-icons">{hasExistingKey ? 'refresh' : 'add'}</span>
                  <span>{hasExistingKey ? 'Regenerate Key' : 'Create Key'}</span>
                </>
              )}
            </button>
          </div>
          <span className="settings-hint">
            {hasExistingKey 
              ? 'Regenerating will delete your current API key and create a new one. Make sure to update any integrations using the old key.'
              : 'Give your API key a descriptive name to identify its purpose. You can only have one API key at a time.'}
          </span>
        </div>
      </form>

      {/* Show newly created key (only once) */}
      {showNewKey && newlyCreatedKey && (
        <div className="settings-api-key-display">
          <div className="settings-api-key-warning">
            <span className="material-icons">warning</span>
            <span>Important: Copy this API key now. You won't be able to see it again!</span>
          </div>
          <div className="settings-api-key-value">
            <code>{newlyCreatedKey.api_key}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(newlyCreatedKey.api_key)}
              className="settings-api-key-copy"
              title="Copy API key"
            >
              <span className="material-icons">content_copy</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowNewKey(false)
              setNewlyCreatedKey(null)
            }}
            className="settings-api-key-close"
          >
            I've copied it
          </button>
        </div>
      )}

      {/* API Keys List */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <span className="material-icons spinning">sync</span>
          <span>Loading API keys...</span>
        </div>
      ) : keys.length === 0 ? (
        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-poppins)' }}>
          No API keys yet. Create your first API key above.
        </div>
      ) : (
        <div className="settings-api-keys-list">
          {keys.map((key) => (
            <div key={key.id} className="settings-api-key-item">
              <div className="settings-api-key-item-content">
                <div className="settings-api-key-item-header">
                  <span className="settings-api-key-item-name">{key.key_name}</span>
                  <span className="settings-api-key-item-id">ID: {key.id.slice(0, 8)}...</span>
                </div>
                <div className="settings-api-key-item-meta">
                  <span className="settings-api-key-item-date">
                    Created: {formatDate(key.created_at)}
                  </span>
                  {key.last_used_at && (
                    <span className="settings-api-key-item-date">
                      Last used: {formatDate(key.last_used_at)}
                    </span>
                  )}
                  {!key.last_used_at && (
                    <span className="settings-api-key-item-unused">Never used</span>
                  )}
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '8px', fontSize: '0.8125rem', color: 'rgba(212, 175, 55, 0.9)', fontFamily: 'var(--font-poppins)' }}>
                  <strong>Security:</strong> This API key can only access your own data. It cannot bypass authentication or access other users' accounts.
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteKey(key.id)}
                className="settings-api-key-delete"
                title="Delete API key"
              >
                <span className="material-icons">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
