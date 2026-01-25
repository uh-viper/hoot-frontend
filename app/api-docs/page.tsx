import { getSessionUser } from '@/lib/auth/validate-session'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import ApiDocsClient from './components/ApiDocsClient'
import '../styles/dashboard.css'
import '../styles/api-docs.css'

export const metadata: Metadata = {
  title: 'Hoot - API Documentation',
}

export default async function ApiDocsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">API Documentation</h1>
        <p className="dashboard-subtitle">Integrate Hoot Services into your applications</p>
      </div>

      <ApiDocsClient />
    </div>
  )
}
