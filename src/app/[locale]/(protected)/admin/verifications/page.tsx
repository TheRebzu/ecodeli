import { Metadata } from 'next';
<<<<<<< HEAD
=======
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationList from '@/components/admin/verification/verification-list';
import UsersVerificationList from '@/components/admin/verification/users-verification-list';
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
import { getTranslations } from 'next-intl/server';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PendingUserVerifications } from '@/components/admin/verification/pending-user-verifications';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin.verification');

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export default async function VerificationsPage() {
  const t = await getTranslations('admin.verification');

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
<<<<<<< HEAD
        <h1 className="text-3xl font-bold tracking-tight">{t('title') || 'Vérifications'}</h1>
        <p className="text-muted-foreground mt-2">
          {t('description') || 'Gérez les demandes de vérification des utilisateurs'}
        </p>
      </div>

      <Tabs defaultValue="deliverers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="deliverers">Livreurs</TabsTrigger>
          <TabsTrigger value="merchants">Commerçants</TabsTrigger>
          <TabsTrigger value="providers">Prestataires</TabsTrigger>
        </TabsList>

        <TabsContent value="deliverers">
          <PendingUserVerifications userRole="DELIVERER" />
        </TabsContent>

        <TabsContent value="merchants">
          <PendingUserVerifications userRole="MERCHANT" />
        </TabsContent>

        <TabsContent value="providers">
          <PendingUserVerifications userRole="PROVIDER" />
=======
        <h1 className="text-3xl font-bold tracking-tight">Vérifications</h1>
        <p className="text-muted-foreground mt-2">
          Gérez les documents et vérifications des utilisateurs
        </p>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests">Requêtes de Vérification</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs & Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <VerificationList />
        </TabsContent>

        <TabsContent value="users">
          <UsersVerificationList />
>>>>>>> 1b63c146c3df5c00cc1ce2e81d59f8f5633cf417
        </TabsContent>
      </Tabs>
    </div>
  );
}
