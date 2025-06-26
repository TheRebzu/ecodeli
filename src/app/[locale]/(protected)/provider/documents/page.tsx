import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ProviderDocumentsManager } from '@/features/provider/components/documents/provider-documents-manager'

export const metadata: Metadata = {
  title: 'Documents - Espace Prestataire | EcoDeli',
  description: 'Gérez vos documents d\'identité et qualifications pour votre compte prestataire EcoDeli'
}

interface ProviderDocumentsPageProps {
  params: {
    locale: string
  }
}

export default async function ProviderDocumentsPage({ params }: ProviderDocumentsPageProps) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'PROVIDER') {
    redirect('/403')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Téléchargez vos documents d'identité et qualifications pour valider votre compte prestataire
          </p>
        </div>
      </div>

      <ProviderDocumentsManager />
    </div>
  )
} 