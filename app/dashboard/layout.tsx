import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { initializeUserData } from '@/lib/api/user-initialization'
import Sidebar from './components/Sidebar'
import '../styles/dashboard.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user has all required database rows (user_credits, user_stats, user_profiles)
  // This check runs on every dashboard page load to handle manually deleted rows
  await initializeUserData(user.id)

  // Fetch user credits from database
  const supabase = await createClient()
  const { data: creditsData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', user.id)
    .single()

  const credits = creditsData?.credits ?? 0

  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.is_admin ?? false

  return (
    <div className="dashboard-layout">
      <Sidebar userEmail={user.email} credits={credits} isAdmin={isAdmin} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
