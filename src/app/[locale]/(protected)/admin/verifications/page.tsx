import { Metadata } from 'next';
import VerificationList from '@/components/admin/verification/verification-list';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.verification');

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export default async function VerificationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{/*t('title')*/}Vérifications</h1>
        <p className="text-muted-foreground mt-2">
          {/*t('description')*/}Gérez les demandes de vérification des utilisateurs
        </p>
      </div>

      <VerificationList />
    </div>
  );
}
