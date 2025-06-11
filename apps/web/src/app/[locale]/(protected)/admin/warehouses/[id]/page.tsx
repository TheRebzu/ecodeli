import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createCaller } from '@/trpc/server';
import { notFound } from 'next/navigation';
import { WarehouseDetail } from '@/components/admin/warehouses/warehouse-detail';
import { PageProps, MetadataProps } from '@/server/auth/next-auth';

export async function generateMetadata({
  params,
}: {
  params: { locale: string; id: string };
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'admin.warehouses.details.meta',
  });

  try {
    const caller = await createCaller();
    const warehouse = await caller.adminWarehouse.getWarehouseById({ id: params.id });

    return {
      title: `${warehouse.warehouse.name} - ${t('title')}`,
      description: t('description'),
    };
  } catch {
    return {
      title: t('title'),
      description: t('description'),
    };
  }
}

export default async function WarehouseDetailPage({ params }: { params: { id: string } }) {
  try {
    const caller = await createCaller();
    const warehouseData = await caller.adminWarehouse.getWarehouseById({ id: params.id });

    return (
      <div className="container py-8">
        <WarehouseDetail warehouseId={params.id} initialData={warehouseData} />
      </div>
    );
  } catch {
    return notFound();
  }
}
