import { getSessionUser } from '@/lib/auth/validate-session'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { ConsoleProvider } from './contexts/ConsoleContext'
import CreationForm from './components/CreationForm'
import StatusConsole from './components/StatusConsole'
import '../../styles/dashboard.css'

export const metadata: Metadata = {
  title: 'Hoot - Creation',
}

export default async function CreationPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <ConsoleProvider>
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Creation</h1>
          <p className="dashboard-subtitle">Start creating business centers</p>
        </div>
        <CreationForm />
        <StatusConsole />
      </div>
    </ConsoleProvider>
  )
}
