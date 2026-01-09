import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth/validate-session'
import Sidebar from './components/Sidebar'
import '../styles/dashboard.css'
import '../styles/base.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="dashboard-layout">
      <Sidebar userEmail={user.email} />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
