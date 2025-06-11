import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import UserDocumentsList from '@/components/admin/verification/user-documents-list';

interface UserDocumentsPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin.verification');

  return {
    title: t('userDocuments.metadata.title', 'User Documents'),
    description: t('userDocuments.metadata.description', 'View and manage user documents'),
  };
}

export default function UserDocumentsPage({ params }: UserDocumentsPageProps) {
  const { id } = params;

  return (
    <div className="container mx-auto py-8">
      <UserDocumentsList userId={id} />
    </div>
  );
}
