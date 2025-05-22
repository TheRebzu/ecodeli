import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { PageHeading } from '@/components/ui/page-heading';
import { Search } from 'lucide-react';
import { DynamicBoxSearchPanel } from '@/components/storage/client-wrapper';
import { PageProps, MetadataProps } from '@/types/next';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'storage' });

  return {
    title: t('searchPage.metaTitle'),
    description: t('searchPage.metaDescription'),
  };
}

export default async function StorageSearchPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
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
