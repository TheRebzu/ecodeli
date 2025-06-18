"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import ProductManager from "@/components/merchant/catalog/product-manager";
import { Card } from "@/components/ui/card";

export default function CreateProductPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Ajouter produit"
        description={t("merchant.CreateProduct.description")}
      />

      <Card className="p-6">
        <ProductManager />
      </Card>
    </div>
  );
}
