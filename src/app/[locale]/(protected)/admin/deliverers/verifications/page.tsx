import { Metadata } from "next";
import { DocumentVerification } from "@/components/admin/document-verification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { DelivererVerificationList } from "@/components/admin/verification/deliverer-verification-list";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";

export const metadata: Metadata = {
  title: "Vérification des livreurs | EcoDeli Admin",
  description: "Vérifiez et approuvez les documents des livreurs",
};

/**
 * Page d'administration pour la vérification des documents des livreurs
 */
export default async function DelivererVerificationsPage() {
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
        userRole: "DELIVERER"
      }
    },
    include: {
      document: true,
      submitter: {
        select: {
          id: true,
          name: true,
          email: true,
          deliverer: true
        }
      }
    },
    orderBy: {
      requestedAt: "desc"
    }
  });
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">{t("deliverer.title")}</h1>
      <DelivererVerificationList verifications={pendingVerifications} />
    </div>
  );
}
