"use client";

import { useState } from 'react'

interface PurchaseHistoryItem {
  id: string
  credits: number
  price: number
  date: string // ISO string to avoid hydration errors
  status: 'completed' | 'pending' | 'failed'
}

interface PurchaseHistoryProps {
  purchases?: PurchaseHistoryItem[]
  allPurchases?: PurchaseHistoryItem[]
}

export default function PurchaseHistory({ purchases = [], allPurchases = [] }: PurchaseHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  
  // Use allPurchases if provided, otherwise use purchases
  const allHistory = allPurchases.length > 0 ? allPurchases : purchases
  const displayHistory = showAll ? allHistory : allHistory.slice(0, 5)
  const hasMore = allHistory.length > 5

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="purchase-history-container">
      <div className="purchase-history-box">
        <div className="purchase-history-header">
          <div className="purchase-history-icon">
            <span className="material-icons">receipt</span>
          </div>
          <h2 className="purchase-history-title">Purchase History</h2>
        </div>

        {allHistory.length === 0 ? (
          <div className="purchase-history-empty">
            <span className="material-symbols-outlined">receipt_long</span>
            <p>No purchase history yet</p>
            <span>Your credit purchases will appear here</span>
          </div>
        ) : (
          <>
            <div className="purchase-history-list">
              {displayHistory.map((purchase) => (
                <div key={purchase.id} className="purchase-history-item">
                  <div className="purchase-history-item-icon">
                    <span className="material-icons">
                      {purchase.status === 'completed' ? 'check_circle' : 
                       purchase.status === 'pending' ? 'credit_card' : 'error'}
                    </span>
                  </div>
                  <div className="purchase-history-item-details">
                    <h3 className="purchase-history-item-title">
                      {purchase.credits} Credits
                    </h3>
                    <p className="purchase-history-item-date">
                      {formatDate(purchase.date)}
                    </p>
                  </div>
                  <div className="purchase-history-item-price">
                    ${purchase.price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && !showAll && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  onClick={() => setShowAll(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  View More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
