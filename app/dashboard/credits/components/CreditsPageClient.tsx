"use client";

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'

export default function CreditsPageClient() {
  const searchParams = useSearchParams()
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      showSuccess('Payment successful! Credits have been added to your account.')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/credits')
    } else if (canceled === 'true') {
      showError('Payment was canceled. No charges were made.')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/credits')
    }
  }, [searchParams, showSuccess, showError])

  return null
}
