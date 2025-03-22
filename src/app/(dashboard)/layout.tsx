import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardFooter } from "@/components/dashboard/footer";
import { getSession } from "@/lib/session-helper";

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
      <DashboardHeader />
      <main className="flex-1 w-full mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>
      <DashboardFooter />
    </div>
  );
}
