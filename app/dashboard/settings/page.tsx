import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
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

  // Get user metadata
  const supabase = await createClient()
  const { data: { user: userWithMetadata } } = await supabase.auth.getUser()
  
  const fullName = userWithMetadata?.user_metadata?.full_name || ''
  const email = user.email || ''

  // Get discord username from user_profiles table (or fallback to metadata)
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('discord_username')
    .eq('user_id', user.id)
    .single()

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
