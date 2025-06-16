import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContractManagement } from "@/components/admin/merchants/merchant-contracts";

export const metadata: Metadata = {
  title: "Gestion des contrats | EcoDeli Admin",
  description: "Gérez les contrats commerçants de la plateforme EcoDeli"};

export default async function ContractsManagementPage() {
  const t = await getTranslations("admin.contracts");

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <ContractManagement />
    </div>
  );
}
