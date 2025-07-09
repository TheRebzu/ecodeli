import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { ServiceRequestsManager } from "@/features/services/components/service-requests-manager"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('serviceRequests')
  
  return {
    title: t("pageTitle"),
    description: t("pageDescription")
  }
}

export default function ServiceRequestsPage() {
  return <ServiceRequestsManager />
}