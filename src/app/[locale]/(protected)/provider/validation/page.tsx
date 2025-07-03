import { setRequestLocale } from "next-intl/server";
import { ProviderCandidature } from "@/features/provider/components/validation/provider-candidature";

interface ProviderValidationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderValidationPage({ 
  params 
}: ProviderValidationPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderCandidature />
    </div>
  );
}