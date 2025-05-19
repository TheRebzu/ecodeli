import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Package, Search, Bell } from 'lucide-react';
import { Container, PageHeading, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { PageProps, MetadataProps } from '@/types/next';
import {
  DynamicBoxReservations,
  DynamicBoxSearchPanel,
  DynamicBoxNotificationsPanel,
} from '@/components/storage/client-wrapper';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth/next-auth';
import { UserRole } from '@prisma/client';

export async function generateMetadata({
  params,
}: {
  params: { locale?: string };
}): Promise<Metadata> {
  // Attendre et extraire le paramètre locale
  const p = await Promise.resolve(params);
  const locale = p.locale || 'fr';

  const t = await getTranslations({ locale, namespace: 'storage' });

  return {
    title: t('dashboardPage.metaTitle'),
    description: t('dashboardPage.metaDescription'),
  };
}

export default async function StorageDashboardPage({ params }: { params: { locale?: string } }) {
  // Attendre et extraire le paramètre locale
  const p = await Promise.resolve(params);
  const locale = p.locale || 'fr';

  const t = await getTranslations({ locale, namespace: 'storage' });

  return (
    <Container>
      <PageHeading title={t('dashboardPage.title')} description={t('dashboardPage.description')} />

      <Tabs defaultValue="reservations" className="w-full">
        <TabsList className="w-full md:w-auto mb-6">
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('tabs.myReservations')}
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            {t('tabs.findBox')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('tabs.notifications')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-6">
          <DynamicBoxReservations />
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <DynamicBoxSearchPanel />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <DynamicBoxNotificationsPanel />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
