import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PendingUserVerifications } from "@/components/admin/verification/pending-user-verifications";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.verification");

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function VerificationsPage() {
  const t = await getTranslations("admin.verification");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("title") || "Vérifications"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("description") ||
            "Gérez les demandes de vérification des utilisateurs"}
        </p>
      </div>

      <Tabs defaultValue="deliverers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="deliverers">Livreurs</TabsTrigger>
          <TabsTrigger value="merchants">Commerçants</TabsTrigger>
          <TabsTrigger value="providers">Prestataires</TabsTrigger>
        </TabsList>

        <TabsContent value="deliverers">
          <PendingUserVerifications userRole="DELIVERER" />
        </TabsContent>

        <TabsContent value="merchants">
          <PendingUserVerifications userRole="MERCHANT" />
        </TabsContent>

        <TabsContent value="providers">
          <PendingUserVerifications userRole="PROVIDER" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
