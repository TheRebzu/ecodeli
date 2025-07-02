import { Metadata } from 'next'
import { UserVerificationsDashboard } from '@/features/admin/components/verifications/user-verifications-dashboard'

interface PendingVerificationsPageProps {
  params: Promise<{
    locale: string
  }>
}

export async function generateMetadata({
  params
}: PendingVerificationsPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'Vérifications en attente - Admin EcoDeli',
    description: 'Liste des utilisateurs avec des documents en attente de vérification'
  }
}

export default async function PendingVerificationsPage({
  params
}: PendingVerificationsPageProps) {
  const { locale } = await params
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Vérifications en attente
        </h1>
        <p className="text-muted-foreground">
          Documents en attente de validation des livreurs, prestataires et commerçants
        </p>
      </div>

      <UserVerificationsDashboard defaultStatus="PENDING" />
    </div>
  )
} 