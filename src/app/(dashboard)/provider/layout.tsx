import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session-helper"
import ProviderSidebar from "@/components/dashboard/provider-sidebar"
import DashboardHeaderWrapper from "@/components/dashboard/dashboard-header-wrapper"

interface ProviderLayoutProps {
  children: ReactNode
}

export default async function ProviderLayout({ children }: ProviderLayoutProps) {
  // Vérifier si l'utilisateur est connecté et a le rôle PROVIDER
  const session = await getSession()

  // Si pas de session ou pas le rôle PROVIDER, rediriger vers la page d'accueil
  if (!session || session.user.role !== "PROVIDER") {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <ProviderSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeaderWrapper 
          user={{
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            role: session.user.role,
            image: session.user.image || undefined
          }} 
          variant="provider" 
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 