import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VerificationDetail } from "@/components/admin/verification/verification-detail";

interface VerificationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params}: VerificationDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const t = await getTranslations("admin.verification");

  return {
    title: t("detail.metadata.title"),
    description: t("detail.metadata.description")};
}

export default async function VerificationDetailPage({
  params}: VerificationDetailPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  return (
    <div className="container mx-auto py-8">
      <VerificationDetail verificationId={id} />
    </div>
  );
}
