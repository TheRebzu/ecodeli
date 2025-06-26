import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/utils'
import { MonitoringDashboard } from '@/features/admin/components/monitoring/monitoring-dashboard'

interface MonitoringPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params
}: MonitoringPageProps): Promise<Metadata> {
  const { locale } = await params
  
  return {
    title: 'Monitoring Système - Admin EcoDeli',
    description: 'Supervision et monitoring du système EcoDeli'
  }
}

export default async function MonitoringPage({
  params
}: MonitoringPageProps) {
  const { locale } = await params
  
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
    redirect(`/${locale}/login`)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Monitoring Système
        </h1>
        <p className="text-muted-foreground">
          Supervision en temps réel de l'infrastructure et des performances
        </p>
      </div>

      <MonitoringDashboard />
    </div>
  )
} 