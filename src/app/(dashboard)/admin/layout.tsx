import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session-helper";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Vérifier si l'utilisateur est connecté et a le rôle ADMIN
  const session = await getSession();

  // Si pas de session ou pas le rôle ADMIN, rediriger vers la page d'accueil
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Administration EcoDeli</h1>
      </div>
      {children}
    </div>
  );
} 