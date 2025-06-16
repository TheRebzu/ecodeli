import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WarehouseForm } from "@/components/admin/warehouses/warehouse-form";
import { createCaller } from "@/trpc/server";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale,
    namespace: "admin.warehouses.form.meta" });

  try {
    const caller = await createCaller();
    const warehouse = await caller.adminWarehouse.getWarehouseById({ id  });

    return {
      title: `${t("editTitle")} - ${warehouse.warehouse.name}`,
      description: t("editDescription")};
  } catch {
    return {
      title: t("editTitle"),
      description: t("editDescription")};
  }
}

export default async function EditWarehousePage({
  params}: {
  params: Promise<{ id }>;
}) {
  const { id } = await params;

  try {
    const caller = await createCaller();
    const warehouseData = await caller.adminWarehouse.getWarehouseById({ id  });
    const warehouse = warehouseData.warehouse;

    return (
      <div className="container py-8 max-w-5xl mx-auto">
        <WarehouseForm
          initialData={{
            id: warehouse.id,
            name: warehouse.name,
            location: warehouse.location,
            address: warehouse.address,
            capacity: warehouse.capacity,
            description: warehouse.description || "",
            isActive: warehouse.isActive}}
          isEditing={true}
        />
      </div>
    );
  } catch {
    return notFound();
  }
}
