"use client";

import { useState } from 'react'
import { formatUTCDateToLocal } from '@/lib/utils/date-timezone'

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

const ITEMS_PER_PAGE = 5

export default function PurchaseHistory({ purchases = [], allPurchases = [] }: PurchaseHistoryProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  
  // Use allPurchases if provided, otherwise use purchases
  const allHistory = allPurchases.length > 0 ? allPurchases : purchases
  const displayHistory = allHistory.slice(0, displayCount)
  const hasMore = displayCount < allHistory.length
  const remainingCount = allHistory.length - displayCount

  const handleViewMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE)
  }

  const formatDate = (dateString: string) => {
    // Convert UTC date from database to local time for display
    return formatUTCDateToLocal(dateString, 'MMM D, YYYY')
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
            {hasMore && (
              <div className="purchase-history-view-more">
                <button
                  onClick={handleViewMore}
                  className="purchase-history-view-more-btn"
                >
                  View More {remainingCount > ITEMS_PER_PAGE ? `(${ITEMS_PER_PAGE} more)` : `(${remainingCount} more)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
