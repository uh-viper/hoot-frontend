import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { initializeUserData } from '@/lib/api/user-initialization'
import CreditPackageCard from './components/CreditPackageCard'
import PurchaseHistory from './components/PurchaseHistory'
import CreditsPageClient from './components/CreditsPageClient'
import { Suspense } from 'react'
import '../../styles/dashboard.css'
import '../../styles/credits.css'

export const metadata: Metadata = {
  title: 'Hoot - Credits',
}

interface CreditPackage {
  id: string
  credits: number
  price: number
  popular?: boolean
}

const creditPackages: CreditPackage[] = [
  { id: '10', credits: 10, price: 10 },
  { id: '25', credits: 25, price: 20 },
  { id: '50', credits: 50, price: 35 },
  { id: '100', credits: 100, price: 65 },
  { id: '250', credits: 250, price: 125, popular: true },
  { id: '500', credits: 500, price: 200 },
  { id: '1000', credits: 1000, price: 350 },
  { id: '2000', credits: 2000, price: 600 },
]

export default async function CreditsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user has all required database rows
  await initializeUserData(user.id)

  // Fetch purchase history
  const supabase = await createClient()
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select('id, credits, amount_paid_cents, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Format purchases for component
  const formattedPurchases = purchases?.map(purchase => ({
    id: purchase.id,
    credits: purchase.credits,
    price: purchase.amount_paid_cents / 100, // Convert cents to dollars
    date: new Date(purchase.created_at),
    status: purchase.status as 'completed' | 'pending' | 'failed',
  })) || []

  return (
    <div className="dashboard-content">
      <Suspense fallback={null}>
        <CreditsPageClient />
      </Suspense>
      
      <div className="dashboard-header">
        <h1 className="dashboard-title">Credits</h1>
        <p className="dashboard-subtitle">Purchase credits here</p>
      </div>

      <div className="credits-packages-container">
        <div className="credits-packages-grid">
          {creditPackages.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              packageId={pkg.id}
              credits={pkg.credits}
              price={pkg.price}
              popular={pkg.popular}
            />
          ))}
        </div>
      </div>

      <PurchaseHistory purchases={formattedPurchases} />
    </div>
  )
}
