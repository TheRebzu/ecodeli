import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session-helper"
import MerchantSidebar from "@/components/dashboard/merchant-sidebar"
import DashboardHeaderWrapper from "@/components/dashboard/dashboard-header-wrapper"

interface MerchantLayoutProps {
  children: ReactNode
}

export default async function MerchantLayout({ children }: MerchantLayoutProps) {
  // Vérifier si l'utilisateur est connecté et a le rôle MERCHANT
  const session = await getSession()

  // Si pas de session ou pas le rôle MERCHANT, rediriger vers la page d'accueil
  if (!session || session.user.role !== "MERCHANT") {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <MerchantSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeaderWrapper 
          user={{
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            role: session.user.role,
            image: session.user.image || undefined
          }} 
          variant="merchant" 
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 