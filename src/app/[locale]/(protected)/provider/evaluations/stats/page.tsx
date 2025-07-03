import { setRequestLocale } from "next-intl/server";
import { ProviderEvaluations } from "@/features/provider/components/evaluations/provider-evaluations";

interface ProviderEvaluationStatsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderEvaluationStatsPage({ 
  params 
}: ProviderEvaluationStatsPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderEvaluations />
    </div>
  );
}