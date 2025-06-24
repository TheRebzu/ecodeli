// Dashboard livreur EcoDeli
import { useTranslations } from "next-intl"
import { DelivererDashboard } from "@/features/deliverer/components/deliverer-dashboard"

export default function DelivererDashboardPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-gray-50">
      <DelivererDashboard />
    </div>
  )
}