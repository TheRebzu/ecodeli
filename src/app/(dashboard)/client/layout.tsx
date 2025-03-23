import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session-helper"
import ClientSidebar from "@/components/dashboard/client-sidebar"
import DashboardHeaderWrapper from "@/components/dashboard/dashboard-header-wrapper"

interface ClientLayoutProps {
  children: ReactNode
}

export default async function ClientLayout({ children }: ClientLayoutProps) {
  // Vérifier si l'utilisateur est connecté et a le rôle CLIENT
  const session = await getSession()

  // Si pas de session ou pas le rôle CLIENT, rediriger vers la page d'accueil
  if (!session || session.user.role !== "CLIENT") {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <ClientSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeaderWrapper 
          user={{
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            role: session.user.role,
            image: session.user.image || undefined
          }} 
          variant="client" 
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 