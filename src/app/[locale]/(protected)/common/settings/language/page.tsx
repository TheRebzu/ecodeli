"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/layout/common/language-switcher";

export default function LanguagePage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Langue"
        description={t("common.Language.description")}
      />

      <Card className="p-6">
        <div className="space-y-4">
          <LanguageSwitcher locale="fr" />
          <p className="text-muted-foreground">
            Choisissez votre langue préférée pour l'interface.
          </p>
        </div>
      </Card>
    </div>
  );
}
