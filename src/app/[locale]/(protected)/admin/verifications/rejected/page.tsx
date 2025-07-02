import { Metadata } from 'next'
import { UserVerificationsDashboard } from '@/features/admin/components/verifications/user-verifications-dashboard'

interface RejectedVerificationsPageProps {
  params: Promise<{
    locale: string
  }>
}

export async function generateMetadata({
  params
}: RejectedVerificationsPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Vérifications rejetées - Admin EcoDeli',
    description: 'Liste des utilisateurs avec des documents rejetés'
  }
}

export default async function RejectedVerificationsPage({
  params
}: RejectedVerificationsPageProps) {
  const { locale } = await params
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Vérifications rejetées
        </h1>
        <p className="text-muted-foreground">
          Documents rejetés des livreurs, prestataires et commerçants
        </p>
      </div>

      <UserVerificationsDashboard defaultStatus="REJECTED" />
    </div>
  )
} 