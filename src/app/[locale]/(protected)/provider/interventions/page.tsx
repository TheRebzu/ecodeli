import { setRequestLocale } from "next-intl/server";
import { ProviderInterventions } from "@/features/provider/components/interventions/provider-interventions";

interface ProviderInterventionsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderInterventionsPage({ 
  params 
}: ProviderInterventionsPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderInterventions />
    </div>
  );
}