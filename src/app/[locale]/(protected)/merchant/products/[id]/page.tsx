import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ProductDetail } from "@/features/merchant/components/products/ProductDetail";
import { PageHeader } from "@/components/layout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProductDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function MerchantProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("merchant.products");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("detail.title")}
        description={t("detail.description")}
      />

      <Suspense fallback={<LoadingSpinner />}>
        <ProductDetail productId={id} />
      </Suspense>
    </div>
  );
}
