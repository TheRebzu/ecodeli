import { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerificationList from '@/components/admin/verification/verification-list';
import UsersVerificationList from '@/components/admin/verification/users-verification-list';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Admin.verification');

  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export default async function VerificationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
