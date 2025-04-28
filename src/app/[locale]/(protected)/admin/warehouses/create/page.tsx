import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { WarehouseForm } from '@/components/admin/warehouses/warehouse-form';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'admin.warehouses.form.meta',
  });

  return {
    title: t('createTitle'),
    description: t('createDescription'),
  };
}

export default async function CreateWarehousePage() {
  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <WarehouseForm />
    </div>
  );
}
