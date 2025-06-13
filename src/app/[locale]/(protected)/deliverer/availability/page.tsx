"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function AvailabilityPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Disponibilité"
        description={t("deliverer.Availability.description")}
      />

      <Card className="p-6">
        <p className="text-muted-foreground">
          Disponibilité - En cours de développement
        </p>
      </Card>
    </div>
  );
}
