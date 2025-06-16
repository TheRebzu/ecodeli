import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createCaller } from "@/trpc/server";
import { notFound } from "next/navigation";
import { WarehouseDetail } from "@/components/admin/warehouses/warehouse-detail";

export async function generateMetadata({
  params}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale,
    namespace: "admin.warehouses.details.meta" });

  try {
    const caller = await createCaller();
    const warehouse = await caller.adminWarehouse.getWarehouseById({ id  });

    return {
      title: `${warehouse.warehouse.name} - ${t("title")}`,
      description: t("description")};
  } catch {
    return {
      title: t("title"),
      description: t("description")};
  }
}

export default async function WarehouseDetailPage({
  params}: {
  params: Promise<{ id }>;
}) {
  const { id } = await params;

  try {
    const caller = await createCaller();
    const warehouseData = await caller.adminWarehouse.getWarehouseById({ id  });

    return (
      <div className="container py-8">
        <WarehouseDetail warehouseId={id} initialData={warehouseData} />
      </div>
    );
  } catch {
    return notFound();
  }
}
