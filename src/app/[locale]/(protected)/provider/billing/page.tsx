import { setRequestLocale } from "next-intl/server";
import { MonthlyBilling } from "@/features/provider/components/billing/monthly-billing";

interface ProviderBillingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderBillingPage({ 
  params 
}: ProviderBillingPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <MonthlyBilling />
    </div>
  );
}