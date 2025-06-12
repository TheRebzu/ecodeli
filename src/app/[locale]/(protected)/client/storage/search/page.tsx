import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { PageHeading } from '@/components/ui/page-heading';
import { Search } from 'lucide-react';
import { DynamicBoxSearchPanel } from '@/components/client/storage/client-wrapper';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'storage' });

  return {
    title: t('searchPage.metaTitle'),
    description: t('searchPage.metaDescription'),
  };
}

export default async function StorageSearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'storage' });

  return (
    <Container>
      <PageHeading
        title={t('searchPage.title')}
        description={t('searchPage.description')}
        icon={<Search className="h-6 w-6" />}
      />

      <div className="mt-6">
        <DynamicBoxSearchPanel />
      </div>
    </Container>
  );
}
