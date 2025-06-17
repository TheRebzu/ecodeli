"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function FAQManagementPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Gestion FAQ"
        description={t("admin.FAQManagement.description")}
      />

      <Card className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Questions fréquentes</h3>
              <p className="text-muted-foreground">Gérer les questions et réponses</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Catégories</h3>
              <p className="text-muted-foreground">Organiser par catégorie</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Statistiques</h3>
              <p className="text-muted-foreground">Analyser les consultations</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Publication</h3>
              <p className="text-muted-foreground">Publier ou masquer</p>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
