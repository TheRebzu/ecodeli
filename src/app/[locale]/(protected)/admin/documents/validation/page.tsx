import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { DocumentValidationDashboard } from '@/features/admin/components/documents/document-validation-dashboard'
import { getCurrentUser } from '@/lib/auth/utils'

interface DocumentValidationPageProps {
  params: Promise<{
    locale: string
  }>
  searchParams: Promise<{
    userId?: string
  }>
}

export async function generateMetadata({
  params
}: DocumentValidationPageProps): Promise<Metadata> {
  const { locale } = await params
  
  return {
    title: 'Validation des documents - Admin EcoDeli',
    description: 'Interface de validation des documents soumis par les utilisateurs'
  }
}

export default async function DocumentValidationPage({
  params,
  searchParams
}: DocumentValidationPageProps) {
  const { locale } = await params
  const { userId } = await searchParams
  
  const user = await getCurrentUser()

  if (!user || user.role !== 'ADMIN') {
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

      <DocumentValidationDashboard initialUserId={userId} />
    </div>
  )
}