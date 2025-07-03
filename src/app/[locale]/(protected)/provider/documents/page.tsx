import { setRequestLocale } from "next-intl/server";
import { ProviderDocuments } from "@/features/provider/components/documents/provider-documents";

interface ProviderDocumentsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProviderDocumentsPage({ 
  params 
}: ProviderDocumentsPageProps) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return (
    <div className="container mx-auto py-6">
      <ProviderDocuments />
    </div>
  );
} 