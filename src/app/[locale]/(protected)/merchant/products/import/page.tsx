import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { BulkImportForm } from "@/features/merchant/components/products/BulkImportForm";
import { PageHeader } from "@/components/layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default async function MerchantBulkImportPage() {
  const t = await getTranslations("merchant.products");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("import.title")}
        description={t("import.description")}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <BulkImportForm />
      </Suspense>
    </div>
  );
}
