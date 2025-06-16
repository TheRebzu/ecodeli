import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import UserDocumentsList from "@/components/admin/verification/user-documents-list";

export async function generateMetadata({
  params}: {
  params: Promise<{ userId }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const t = await getTranslations("admin.verification");

  return {
    title: `${t("userVerification.title")} | Admin`,
    description: t("userVerification.description")};
}

export default async function UserVerificationPage({
  params}: {
  params: Promise<{ userId }>;
}) {
  const { userId } = await params;

  return (
    <div className="container mx-auto py-8">
      <UserDocumentsList userId={userId} />
    </div>
  );
}
