"use client";

import { useAuth } from "@/hooks/use-auth";
import DocumentManager from "@/features/deliverer/components/documents/document-manager";
import { DelivererCandidacy } from "@/features/deliverer/components/recruitment/deliverer-candidacy";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DelivererDocumentsPage() {
  const { user } = useAuth();
  const t = useTranslations("deliverer.documents");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents et Candidature"
        description="Gérez vos documents justificatifs et votre candidature de livreur"
      />

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidacy">Candidature</TabsTrigger>
          <TabsTrigger value="documents">Gestion Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="candidacy" className="space-y-4">
          <DelivererCandidacy />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentManager delivererId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
