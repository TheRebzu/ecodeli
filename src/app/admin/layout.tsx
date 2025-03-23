import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session-helper"
import AdminSidebar from "@/components/dashboard/admin-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface AdminLayoutProps {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Vérifier si l'utilisateur est connecté et a le rôle ADMIN
  const session = await getSession()

  // Si pas de session ou pas le rôle ADMIN, rediriger vers la page d'accueil
  if (!session || session.user.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          user={{
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            role: session.user.role,
            image: session.user.image || undefined
          }} 
          variant="admin" 
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 