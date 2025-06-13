"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function EditProductPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Modifier produit"
        description={t("merchant.EditProduct.description")}
      />

      <Card className="p-6">
        <p className="text-muted-foreground">
          Modifier produit - En cours de développement
        </p>
      </Card>
    </div>
  );
}
