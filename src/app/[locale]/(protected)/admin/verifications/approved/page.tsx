import { Metadata } from "next";
import { UserVerificationsDashboard } from "@/features/admin/components/verifications/user-verifications-dashboard";

interface ApprovedVerificationsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: ApprovedVerificationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Vérifications approuvées - Admin EcoDeli",
    description: "Liste des utilisateurs avec des documents approuvés",
  };
}

export default async function ApprovedVerificationsPage({
  params,
}: ApprovedVerificationsPageProps) {
  const { locale } = await params;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vérifications approuvées</h1>
        <p className="text-muted-foreground">
          Documents approuvés des livreurs, prestataires et commerçants
        </p>
      </div>

      <UserVerificationsDashboard defaultStatus="APPROVED" />
    </div>
  );
}
