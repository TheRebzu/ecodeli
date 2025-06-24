// Dashboard client EcoDeli
import { useTranslations } from "next-intl"
import { ClientDashboard } from "@/features/client/components/client-dashboard"

export default function ClientDashboardPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientDashboard />
    </div>
  )
}