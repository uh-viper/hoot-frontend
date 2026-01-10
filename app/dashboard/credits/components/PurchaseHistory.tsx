"use client";

interface PurchaseHistoryItem {
  id: string
  credits: number
  price: number
  date: Date
  status: 'completed' | 'pending' | 'failed'
}

interface PurchaseHistoryProps {
  purchases?: PurchaseHistoryItem[]
}

export default function PurchaseHistory({ purchases = [] }: PurchaseHistoryProps) {
  // TODO: Replace with actual purchase data from API/database
  const purchaseHistory: PurchaseHistoryItem[] = purchases.length > 0 
    ? purchases 
    : [
        // Example purchase history (remove when connected to real data)
        // {
        //   id: '1',
        //   credits: 250,
        //   price: 125,
        //   date: new Date('2024-01-15'),
        //   status: 'completed'
        // },
      ]

  const formatDate = (date: Date) => {
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
            <span className="material-icons">history</span>
          </div>
          <h2 className="purchase-history-title">Purchase History</h2>
        </div>

        {purchaseHistory.length === 0 ? (
          <div className="purchase-history-empty">
            <span className="material-icons">receipt</span>
            <p>No purchase history yet</p>
            <span>Your credit purchases will appear here</span>
          </div>
        ) : (
          <div className="purchase-history-list">
            {purchaseHistory.map((purchase) => (
              <div key={purchase.id} className="purchase-history-item">
                <div className="purchase-history-item-icon">
                  <span className="material-icons">
                    {purchase.status === 'completed' ? 'check_circle' : 
                     purchase.status === 'pending' ? 'pending' : 'error'}
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
                <div className="purchase-history-item-credits">
                  +{purchase.credits.toLocaleString()}
                </div>
                <div className="purchase-history-item-price">
                  ${purchase.price.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
