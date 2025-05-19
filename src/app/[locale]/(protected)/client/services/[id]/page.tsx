import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ServiceDetail } from '@/components/services/service-detail';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/trpc/server';
import { PageProps, MetadataProps } from '@/types/next';

interface ServicePageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const t = await getTranslations('services');

  try {
    const service = await api.service.getServiceById.query({
      id: params.id,
    });

    return {
      title: `${service.name} | ${t('detail.service')}`,
      description: service.description.substring(0, 160),
    };
  } catch (error) {
    return {
      title: t('detail.serviceNotFound'),
      description: t('detail.serviceNotFoundDesc'),
    };
  }
}

export default async function ServicePage({ params }: ServicePageProps) {
  const t = await getTranslations('services');

  try {
    const service = await api.service.getServiceById.query({
      id: params.id,
    });

    return (
      <div className="container py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          }
        >
          <ServiceDetail service={service} />
        </Suspense>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
