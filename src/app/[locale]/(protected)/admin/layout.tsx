"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { AdminHeader } from "@/components/layout/admin-header"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Settings,
  Shield,
  Activity,
  BarChart3,
  MessageSquare,
  Package,
  CreditCard,
  MapPin,
  UserCheck,
  Building
} from "lucide-react"
import { Link } from "@/i18n/navigation"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const router = useRouter()
  const t = useTranslations('common')
  const admin = useTranslations('admin')
  
  // Données utilisateur simplifiées
  const user = { email: "admin-complete@test.com", name: "Admin EcoDeli" }
  const isAuthenticated = true

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/fr/login')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      router.push('/fr/login')
    }
  }

  // Menu de navigation sidebar simplifié
  const navigationItems = [
    {
      section: "Principal",
      items: [
        { href: "/admin", label: "Dashboard", icon: BarChart3 },
        { href: "/admin/users", label: "Utilisateurs", icon: Users },
        { href: "/admin/verifications", label: "Vérifications", icon: UserCheck },
      ]
    },
    {
      section: "Gestion",
      items: [
        { href: "/admin/deliveries", label: "Livraisons", icon: Package },
        { href: "/admin/announcements", label: "Annonces", icon: MessageSquare },
        { href: "/admin/finance", label: "Finance", icon: CreditCard },
        { href: "/admin/locations", label: "Entrepôts", icon: MapPin },
      ]
    },
    {
      section: "Système",
      items: [
        { href: "/admin/monitoring", label: "Surveillance", icon: Activity },
        { href: "/admin/settings", label: "Paramètres", icon: Settings },
        { href: "/admin/contracts", label: "Contrats", icon: Building },
      ]
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Chargement du panel admin...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin */}
      <AdminHeader 
        user={user}
        onLogout={handleLogout}
        pendingValidations={0}
        systemAlerts={0}
      />

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 min-h-screen transition-all duration-300`}>
          <div className="p-4">
            {/* Toggle Sidebar */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mb-4 w-full"
            >
              <Activity className="h-4 w-4" />
              {isSidebarOpen && <span className="ml-2">Réduire</span>}
            </Button>

            {/* Navigation */}
            <nav className="space-y-6">
              {navigationItems.map((section, index) => (
                <div key={index}>
                  {isSidebarOpen && (
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {section.section}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors group"
                      >
                        <item.icon className="h-5 w-5 mr-3 text-gray-400 group-hover:text-red-600" />
                        {isSidebarOpen && (
                          <span className="flex-1">{item.label}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Status du système */}
            {isSidebarOpen && (
              <div className="mt-8 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-green-700 font-medium">
                    Système Opérationnel
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Tous les services fonctionnent normalement
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
} 