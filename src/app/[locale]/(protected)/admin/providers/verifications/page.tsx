import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { ProviderVerificationList } from "@/components/admin/verification/provider-verification-list";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Vérification des prestataires | EcoDeli Admin",
  description: "Vérifiez et approuvez les documents des prestataires",
};

/**
 * Page d'administration pour la vérification des documents des prestataires
 */
export default async function ProviderVerificationsPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("admin.verifications");
  
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  
  // Get pending verification requests
  const pendingVerifications = await db.verification.findMany({
    where: {
      status: "PENDING",
      document: {
        userRole: "PROVIDER"
      }
    },
    include: {
      document: true,
      submitter: {
        select: {
          id: true,
          name: true,
          email: true,
          provider: true
        }
      }
    },
    orderBy: {
      requestedAt: "desc"
    }
  });
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">{t("provider.title")}</h1>
      <ProviderVerificationList verifications={pendingVerifications} />
    </div>
  );
}
