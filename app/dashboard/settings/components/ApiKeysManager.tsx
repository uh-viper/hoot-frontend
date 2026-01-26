"use client";

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null)

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
        setNewlyGeneratedKey(data.key.api_key)
        showSuccess('API key generated successfully!')
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
      // Hide the key after copying
      setNewlyGeneratedKey(null)
    } catch (error) {
      console.error('Failed to copy:', error)
      showError('Failed to copy to clipboard')
    }
  }

  return (
    <div className="settings-api-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Generate Button */}
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

        {/* Show newly generated key to the right */}
        {newlyGeneratedKey && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 1rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
            <code style={{ 
              fontFamily: 'Courier New, monospace', 
              fontSize: '0.875rem', 
              color: '#d4af37',
              letterSpacing: '0.5px'
            }}>
              {newlyGeneratedKey}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(newlyGeneratedKey)}
              className="settings-api-key-copy"
              title="Copy API key"
              style={{ padding: '0.375rem' }}
            >
              <span className="material-icons" style={{ fontSize: '1rem' }}>content_copy</span>
            </button>
          </div>
        )}

        {/* Status Message - to the right of button */}
        {!isLoading && !newlyGeneratedKey && hasKey && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(212, 175, 55, 0.1)', 
            border: '1px solid rgba(212, 175, 55, 0.3)', 
            borderRadius: '6px',
            color: 'rgba(212, 175, 55, 0.9)',
            fontFamily: 'var(--font-poppins)',
            fontSize: '0.8125rem'
          }}>
            <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span>
            <span>API key active</span>
          </div>
        )}

        {/* No key message */}
        {!isLoading && !newlyGeneratedKey && !hasKey && (
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontFamily: 'var(--font-poppins)', 
            fontSize: '0.875rem' 
          }}>
            You do not have an API key yet.
          </div>
        )}

        {/* Loading state - inline */}
        {isLoading && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'var(--font-poppins)',
            fontSize: '0.875rem'
          }}>
            <span className="material-icons spinning" style={{ fontSize: '1rem' }}>sync</span>
            <span>Loading...</span>
          </div>
        )}
      </div>
    </div>
  )
}
