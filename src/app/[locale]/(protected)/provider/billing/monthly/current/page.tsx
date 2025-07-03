import { setRequestLocale } from "next-intl/server";
import { CurrentMonthSummary } from "@/features/provider/components/billing/current-month-summary";

interface CurrentMonthSummaryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CurrentMonthSummaryPage({ 
  params 
}: CurrentMonthSummaryPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <CurrentMonthSummary />
    </div>
  );
}