import { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DocumentValidationDashboard } from '@/features/admin/components/documents/document-validation-dashboard'

interface DocumentValidationPageProps {
  params: {
    locale: string
  }
}

export async function generateMetadata({
  params: { locale }
}: DocumentValidationPageProps): Promise<Metadata> {
  return {
    title: 'Validation des documents - Admin EcoDeli',
    description: 'Interface de validation des documents soumis par les utilisateurs'
  }
}

export default async function DocumentValidationPage({
  params: { locale }
}: DocumentValidationPageProps) {
  const session = await auth.api.getSession({
    headers: await import('next/headers').then(mod => mod.headers())
  })

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect(`/${locale}/login`)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Validation des documents
        </h1>
        <p className="text-muted-foreground">
          Gérez et validez les documents soumis par les livreurs, prestataires et commerçants
        </p>
      </div>

      <DocumentValidationDashboard />
    </div>
  )
}