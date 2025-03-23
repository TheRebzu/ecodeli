import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session-helper";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
} 