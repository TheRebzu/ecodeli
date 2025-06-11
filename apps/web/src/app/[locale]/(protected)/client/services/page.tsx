import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ServiceList } from '@/components/client/services/service-search';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('services');

  return {
    title: t('list.title'),
    description: t('list.description'),
  };
}

export default async function ServicesPage() {
  const t = await getTranslations('services');

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('list.title')}</h1>
      <p className="text-muted-foreground">{t('list.subtitle')}</p>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        }
      >
        <ServiceList />
      </Suspense>
    </div>
  );
}
