import { Metadata } from 'next'
import { UserVerificationsDashboard } from '@/features/admin/components/verifications/user-verifications-dashboard'

interface VerificationsPageProps {
  params: {
    locale: string
  }
}

export async function generateMetadata({
  params: { locale }
}: VerificationsPageProps): Promise<Metadata> {
  return {
    title: 'Vérifications des utilisateurs - Admin EcoDeli',
    description: 'Liste des utilisateurs nécessitant une vérification avec leurs documents'
  }
}

export default async function VerificationsPage({
  params: { locale }
}: VerificationsPageProps) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Vérifications des utilisateurs
        </h1>
        <p className="text-muted-foreground">
          Liste des livreurs, prestataires et commerçants nécessitant une vérification de leurs documents
        </p>
      </div>

      <UserVerificationsDashboard />
    </div>
  )
} 