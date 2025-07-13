import { setRequestLocale } from "next-intl/server";
import { ProviderRatesValidation } from "@/features/provider/components/validation/rates-validation";

interface ProviderRatesValidationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderRatesValidationPage({
  params,
}: ProviderRatesValidationPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderRatesValidation />
    </div>
  );
}
