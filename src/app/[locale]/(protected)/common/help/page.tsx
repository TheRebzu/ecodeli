"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function HelpPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Aide" description={t("common.Help.description")} />

      <Card className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Prise en main</h3>
              <p className="text-muted-foreground">Guide pour commencer avec EcoDeli</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">FAQ</h3>
              <p className="text-muted-foreground">Questions fréquemment posées</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Contact Support</h3>
              <p className="text-muted-foreground">Contactez notre équipe support</p>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold mb-2">Tutoriels</h3>
              <p className="text-muted-foreground">Tutoriels vidéo et guides</p>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
