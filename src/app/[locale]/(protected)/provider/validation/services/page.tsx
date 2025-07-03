import { setRequestLocale } from "next-intl/server";
import { ProviderServicesValidation } from "@/features/provider/components/validation/services-validation";

interface ProviderServicesValidationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderServicesValidationPage({ 
  params 
}: ProviderServicesValidationPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderServicesValidation />
    </div>
  );
}