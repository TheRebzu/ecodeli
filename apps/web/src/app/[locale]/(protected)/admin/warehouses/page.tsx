import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { WarehouseList } from '@/components/admin/warehouses/warehouse-list';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.warehouses.meta' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function WarehousesPage() {
  return (
    <div className="container py-8">
      <WarehouseList />
    </div>
  );
}
