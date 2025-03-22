import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { checkRoleAccess } from "@/lib/loaders/dashboard-loader";

interface ClientDashboardLayoutProps {
  children: ReactNode;
}

export default async function ClientDashboardLayout({
  children,
}: ClientDashboardLayoutProps) {
  // Vérification que l'utilisateur a un rôle CLIENT
  const hasAccess = await checkRoleAccess([Role.CLIENT]);
  
  if (!hasAccess) {
    // Rediriger vers le dashboard général qui s'occupera de rediriger vers le bon dashboard
    redirect('/dashboard');
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Dashboard Client</h1>
        <p className="text-muted-foreground">
          Bienvenue sur votre espace client EcoDéli
        </p>
      </div>
      
      {children}
    </div>
  );
} 