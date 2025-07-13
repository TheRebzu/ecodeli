import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/lib/auth/utils";
import { ProviderBillingDashboard } from "@/features/admin/components/billing/provider-billing-dashboard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.admin.billing" });

  return {
    title: "Facturation Mensuelle - Admin EcoDeli",
    description:
      "Gestion de la facturation automatique mensuelle des prestataires",
  };
}

export default async function MonthlyBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user || session.user.role !== USER_ROLES.ADMIN) {
    redirect(`/${locale}/login`);
  }

  return <ProviderBillingDashboard />;
}
