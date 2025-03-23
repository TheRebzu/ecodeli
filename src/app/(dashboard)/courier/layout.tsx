import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session-helper"
import CourierSidebar from "@/components/dashboard/courier-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"

interface CourierLayoutProps {
  children: ReactNode
}

export default async function CourierLayout({ children }: CourierLayoutProps) {
  // Vérifier si l'utilisateur est connecté et a le rôle COURIER
  const session = await getSession()

  // Si pas de session ou pas le rôle COURIER, rediriger vers la page d'accueil
  if (!session || session.user.role !== "COURIER") {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <CourierSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          user={{
            name: session.user.name || undefined,
            email: session.user.email || undefined,
            role: session.user.role,
            image: session.user.image || undefined
          }} 
          variant="courier" 
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}