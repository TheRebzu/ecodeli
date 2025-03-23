import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardFooter } from "@/components/dashboard/footer";
import { getSession } from "@/lib/session-helper";
import ClientHeader from "@/components/dashboard/client-header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Vérifier si l'utilisateur est connecté
  const session = await getSession();

  // Si pas de session, rediriger vers la page de connexion
  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ClientHeader />
      <div className="flex flex-col flex-1">
        <main className="flex-1 w-full mx-auto max-w-screen-xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 overflow-x-hidden">
          {children}
        </main>
        <DashboardFooter />
      </div>
    </div>
  );
}
