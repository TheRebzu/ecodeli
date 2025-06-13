import { Suspense } from "react";
import { ClientDashboard } from "@/components/client/dashboard/client-dashboard";
import { Loader2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/next-auth";
import { redirect } from "next/navigation";
import { UserStatus } from "@/server/db/enums";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ClientDashboardPage({ params }: Props) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  // Vérifications de sécurité
  if (!session || !session.user) {
    redirect(`/${locale}/login`);
  }

  if (session.user.role !== "CLIENT") {
    redirect(`/${locale}/dashboard`);
  }

  // Vérification du statut du compte
  if (session.user.status === UserStatus.PENDING_VERIFICATION) {
    redirect(`/${locale}/client/profile?verification_required=true`);
  }

  return (
    <div className="container mx-auto py-6 px-4 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Gérez vos annonces, services et livraisons
        </p>
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
