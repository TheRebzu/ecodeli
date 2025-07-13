import { setRequestLocale } from "next-intl/server";
import { ProviderDashboardComplete } from "@/features/provider/components/dashboard/provider-dashboard-complete";

interface ProviderDashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderDashboardPage({
  params,
}: ProviderDashboardPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderDashboardComplete />
    </div>
  );
}
