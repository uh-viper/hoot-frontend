import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
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

  // Fetch user credits from database, creating if they don't exist
  const supabase = await createClient()
  let { data: creditsData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', user.id)
    .single()

  // If credits don't exist, create them
  if (!creditsData) {
    await supabase
      .from('user_credits')
      .insert({ user_id: user.id, credits: 0 })
    
    // Fetch again
    const result = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single()
    
    creditsData = result.data
  }

  const credits = creditsData?.credits ?? 0

  return (
    <div className="dashboard-layout">
      <Sidebar userEmail={user.email} credits={credits} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
