"use client";

import { useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'

interface CreditPackageCardProps {
  packageId: string
  credits: number
  price: number
  popular?: boolean
}

export default function CreditPackageCard({ packageId, credits, price, popular }: CreditPackageCardProps) {
  const { showError, showSuccess } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const pricePerCredit = (price / credits).toFixed(2)
  const basePricePerCredit = 1.00 // Base rate: $1.00 per credit (from 10 credits package)
  const savingsPercent = Math.round(((basePricePerCredit - (price / credits)) / basePricePerCredit) * 100)
  const savings = savingsPercent > 0 ? savingsPercent : 0

  const handlePurchase = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credits,
          price,
          packageId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      showError(error instanceof Error ? error.message : 'Failed to start checkout. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className={`credit-package-card ${popular ? 'popular' : ''}`}>
      {popular && (
        <div className="credit-package-badge">
          <span className="material-icons">star</span>
          <span>Most Popular</span>
        </div>
      )}
      
      <div className="credit-package-header">
        <div className="credit-package-icon">
          <span className="material-icons">account_balance_wallet</span>
        </div>
        <div className="credit-package-amount">
          <span className="credit-amount-value">{credits}</span>
          <span className="credit-amount-label">Credits</span>
        </div>
      </div>

      <div className="credit-package-pricing">
        <div className="credit-price-main">
          <span className="credit-price-symbol">$</span>
          <span className="credit-price-value">{price}</span>
        </div>
        <div className="credit-price-per">
          ${pricePerCredit} per credit
        </div>
      </div>

      {savings > 0 && (
        <div className="credit-package-savings">
          <span className="material-icons">savings</span>
          <span>Save {savings}%</span>
        </div>
      )}

      <button 
        className="credit-purchase-btn"
        onClick={handlePurchase}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="material-icons spinning">sync</span>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <span>Purchase</span>
            <span className="material-icons">arrow_forward</span>
          </>
        )}
      </button>
    </div>
  )
}
