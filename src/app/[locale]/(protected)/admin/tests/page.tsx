import { Metadata } from "next"
import { TestsDashboard } from "@/features/admin/components/tests/tests-dashboard"

export const metadata: Metadata = {
  title: "Tests - Admin EcoDeli",
  description: "Section de tests pour vérifier les emails, notifications et APIs",
}

export default function AdminTestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tests & Diagnostics</h1>
          <p className="text-gray-600 mt-2">
            Testez les emails, notifications OneSignal et les APIs du projet
          </p>
        </div>
      </div>

      <TestsDashboard />
    </div>
  )
} 