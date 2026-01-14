import { getSessionUser } from '@/lib/auth/validate-session'
import { isAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import AdminDashboardClient from './components/AdminDashboardClient'
import '../../styles/dashboard.css'
import './admin.css'

export const metadata: Metadata = {
  title: 'Hoot - Admin Dashboard',
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const userIsAdmin = await isAdmin()
  
  if (!userIsAdmin) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Fetch all users with their stats
  // This query will work if user is admin (RLS policy allows it)
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select(`
      id,
      user_id,
      email,
      full_name,
      discord_username,
      is_admin,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })

  if (usersError) {
    console.error('Error fetching users:', usersError)
  }

  // Fetch user stats from user_jobs (calculate per user)
  const { data: allJobs, error: jobsError } = await supabase
    .from('user_jobs')
    .select('user_id, requested_count, successful_count, failed_count')

  // Calculate stats per user from jobs
  const allStats = allJobs?.reduce((acc, job) => {
    if (!acc[job.user_id]) {
      acc[job.user_id] = { user_id: job.user_id, requested: 0, successful: 0, failures: 0 }
    }
    acc[job.user_id].requested += job.requested_count || 0
    acc[job.user_id].successful += job.successful_count || 0
    acc[job.user_id].failures += job.failed_count || 0
    return acc
  }, {} as Record<string, { user_id: string; requested: number; successful: number; failures: number }>)

  const statsError = jobsError

  // Fetch user credits
  const { data: allCredits, error: creditsError } = await supabase
    .from('user_credits')
    .select('user_id, credits')
    .order('credits', { ascending: false })

  // Count total business centers
  const { count: totalBCs } = await supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })

  // Count total purchases
  const { count: totalPurchases } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })

  // Get recent purchases
  const { data: recentPurchases } = await supabase
    .from('purchases')
    .select('id, user_id, credits, amount_paid_cents, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Combine user data with stats and credits
  const usersWithData = (users || []).map(user => {
    const stats = allStats?.find(s => s.user_id === user.user_id)
    const credits = allCredits?.find(c => c.user_id === user.user_id)
    
    return {
      ...user,
      stats: {
        requested: stats?.requested ?? 0,
        successful: stats?.successful ?? 0,
        failures: stats?.failures ?? 0,
      },
      credits: credits?.credits ?? 0,
    }
  })

  // Calculate totals
  const totalUsers = users?.length ?? 0
  const totalCreditsIssued = allCredits?.reduce((sum, c) => sum + c.credits, 0) ?? 0
  const totalRequested = allStats?.reduce((sum, s) => sum + s.requested, 0) ?? 0
  const totalSuccessful = allStats?.reduce((sum, s) => sum + s.successful, 0) ?? 0
  const totalFailures = allStats?.reduce((sum, s) => sum + s.failures, 0) ?? 0

  // Get all purchases for revenue calculation
  const { data: allPurchases } = await supabase
    .from('purchases')
    .select('id, user_id, credits, amount_paid_cents, status, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <p className="dashboard-subtitle">System overview and user management</p>
      </div>

      {/* Admin Dashboard Client Component */}
      <AdminDashboardClient 
        users={usersWithData}
        recentPurchases={recentPurchases || []}
        allPurchases={allPurchases || []}
        initialStats={{
          totalRequested,
          totalSuccessful,
          totalFailures,
        }}
      />
    </div>
  )
}
