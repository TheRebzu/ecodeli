import { Suspense } from "react";
import { ClientDashboard } from "@/components/client/dashboard/client-dashboard";
import { Loader2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { redirect } from "next/navigation";
import { UserStatus } from "@/server/db/enums";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";

interface Props {
  params: Promise<{ locale }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard.client"  });

  return {
    title: t("pageTitle"),
    description: t("pageDescription")};
}

export default async function ClientDashboardPage({ params }: Props) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  const t = await getTranslations({ locale, namespace: "dashboard.client"  });

  // Vérifications de sécurité
  if (!session || !session.user) {
    redirect(`/${locale}/login`);
  }

  if (session.user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }

  // Vérification du statut du compte
  if (session.user.status === UserStatus.PENDINGVERIFICATION) {
    redirect(`/${locale}/client/profile?verification_required=true`);
  }

  return (
    <div className="container mx-auto py-6 px-4 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <ClientDashboard />
      </Suspense>
    </div>
  );
}
