import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WarehouseForm } from "@/components/admin/warehouses/warehouse-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "admin.warehouses.form.meta",
  });

  return {
    title: t("createTitle"),
    description: t("createDescription"),
  };
}

export default async function CreateWarehousePage() {
  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <WarehouseForm />
    </div>
  );
}
