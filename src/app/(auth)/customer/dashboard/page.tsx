import type { Metadata } from "next"
import CustomerDashboard from "@/components/customer/dashboard/content"

export const metadata: Metadata = {
  title: "Tableau de bord client",
  description: "Gérez vos livraisons et services EcoDeli",
}

export default function DashboardPage() {
  return <CustomerDashboard />
}

