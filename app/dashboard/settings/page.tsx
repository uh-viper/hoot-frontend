import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { initializeUserData } from '@/lib/api/user-initialization'
import SettingsForm from './components/SettingsForm'
import '../../styles/dashboard.css'
import '../../styles/settings.css'

export const metadata: Metadata = {
  title: 'Hoot - Settings',
}

export default async function SettingsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user data is initialized (creates user_profiles if missing)
  // This handles users who signed up before user_profiles table existed
  await initializeUserData(user.id)

  // Get user metadata (fallback)
  const supabase = await createClient()
  const { data: { user: userWithMetadata } } = await supabase.auth.getUser()
  
  // Get profile data from user_profiles table (or fallback to metadata)
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('discord_username, full_name, email')
    .eq('user_id', user.id)
    .single()

  // Use profile table data first, fallback to user_metadata/auth
  const fullName = profileData?.full_name || userWithMetadata?.user_metadata?.full_name || ''
  const email = profileData?.email || user.email || ''
  const discordUsername = profileData?.discord_username || userWithMetadata?.user_metadata?.discord_username || ''

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Update your settings here</p>
      </div>

      <SettingsForm
        initialName={fullName}
        initialEmail={email}
        initialDiscordUsername={discordUsername}
      />
    </div>
  )
}
