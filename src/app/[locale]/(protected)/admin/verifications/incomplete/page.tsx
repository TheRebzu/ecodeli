import { Metadata } from "next";
import { UserVerificationsDashboard } from "@/features/admin/components/verifications/user-verifications-dashboard";

interface IncompleteVerificationsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export async function generateMetadata({
  params,
}: IncompleteVerificationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Vérifications incomplètes - Admin EcoDeli",
    description: "Liste des utilisateurs avec des documents incomplets",
  };
}

export default async function IncompleteVerificationsPage({
  params,
}: IncompleteVerificationsPageProps) {
  const { locale } = await params;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Vérifications incomplètes</h1>
        <p className="text-muted-foreground">
          Documents incomplets des livreurs, prestataires et commerçants
        </p>
      </div>

      <UserVerificationsDashboard defaultStatus="INCOMPLETE" />
    </div>
  );
}
