"use client";

import { useState, useEffect } from 'react'
import { useToast } from '../../../contexts/ToastContext'

interface ApiKeyStatus {
  id: string
  last_used_at: string | null
  created_at: string
}

interface ApiKeysManagerProps {}

export default function ApiKeysManager({}: ApiKeysManagerProps) {
  const { showSuccess, showError } = useToast()
  const [hasKey, setHasKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<{ id: string; api_key: string; created_at: string } | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)

  // Fetch API key status on mount
  useEffect(() => {
    fetchKeyStatus()
  }, [])

  const fetchKeyStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/api-keys')
      const data = await response.json()

      if (response.ok) {
        setHasKey(data.hasKey || false)
      } else {
        showError(data.error || 'Failed to fetch API key status')
      }
    } catch (error) {
      console.error('Error fetching API key status:', error)
      showError('Failed to fetch API key status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateKey = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setNewlyGeneratedKey(data.key)
        setShowNewKey(true)
        showSuccess('API key generated successfully! Copy it now - you won\'t be able to see it again.')
        await fetchKeyStatus() // Refresh status
      } else {
        showError(data.error || 'Failed to generate API key')
      }
    } catch (error) {
      console.error('Error generating API key:', error)
      showError('Failed to generate API key')
    } finally {
      setIsGenerating(false)
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

  return (
    <div className="settings-api-content">
      {/* Generate Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <button
          type="button"
          onClick={handleGenerateKey}
          disabled={isGenerating}
          className="settings-submit-btn"
          style={{ width: 'fit-content', minWidth: '180px' }}
        >
          {isGenerating ? (
            <>
              <span className="material-icons spinning">sync</span>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span className="material-icons">key</span>
              <span>{hasKey ? 'Regenerate API Key' : 'Generate API Key'}</span>
            </>
          )}
        </button>
      </div>

      {/* Show newly generated key (only once) */}
      {showNewKey && newlyGeneratedKey && (
        <div className="settings-api-key-display">
          <div className="settings-api-key-warning">
            <span className="material-icons">warning</span>
            <span>Important: Copy this API key now. You won't be able to see it again!</span>
          </div>
          <div className="settings-api-key-value">
            <code>{newlyGeneratedKey.api_key}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(newlyGeneratedKey.api_key)}
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
              setNewlyGeneratedKey(null)
            }}
            className="settings-api-key-close"
          >
            I've copied it
          </button>
        </div>
      )}

      {/* Status Message */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <span className="material-icons spinning">sync</span>
          <span>Loading...</span>
        </div>
      ) : hasKey && !showNewKey ? (
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(212, 175, 55, 0.1)', 
          border: '1px solid rgba(212, 175, 55, 0.3)', 
          borderRadius: '8px',
          color: 'rgba(212, 175, 55, 0.9)',
          fontFamily: 'var(--font-poppins)',
          fontSize: '0.875rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="material-icons" style={{ fontSize: '1.125rem' }}>check_circle</span>
            <strong>API key active</strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(212, 175, 55, 0.7)' }}>
            Your API key is ready to use. Regenerate to create a new one.
          </div>
        </div>
      ) : !hasKey && !showNewKey ? (
        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'var(--font-poppins)', fontSize: '0.875rem' }}>
          No API key yet. Click "Generate API Key" to create one.
        </div>
      ) : null}
    </div>
  )
}
