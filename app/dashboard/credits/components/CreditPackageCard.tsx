"use client";

interface CreditPackageCardProps {
  credits: number
  price: number
  popular?: boolean
}

export default function CreditPackageCard({ credits, price, popular }: CreditPackageCardProps) {
  const pricePerCredit = (price / credits).toFixed(2)
  const basePricePerCredit = 1.00 // Base rate: $1.00 per credit (from 10 credits package)
  const savingsPercent = Math.round(((basePricePerCredit - (price / credits)) / basePricePerCredit) * 100)
  const savings = savingsPercent > 0 ? savingsPercent : 0

  const handlePurchase = () => {
    // TODO: Implement purchase functionality
    console.log(`Purchasing ${credits} credits for $${price}`)
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
      >
        <span>Purchase</span>
        <span className="material-icons">arrow_forward</span>
      </button>
    </div>
  )
}
