"use client";

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useToast } from '../../../contexts/ToastContext'

export default function CreditsPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      showSuccess('Payment successful! Credits have been added to your account.')
      // Clean up URL first
      window.history.replaceState({}, '', '/dashboard/credits')
      // Force refresh to update credits in sidebar
      router.refresh()
    } else if (canceled === 'true') {
      showError('Payment was canceled. No charges were made.')
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/credits')
    }
  }, [searchParams, showSuccess, showError, router])

  return null
}
