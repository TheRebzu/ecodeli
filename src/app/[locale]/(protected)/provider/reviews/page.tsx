"use client";

import { useAuth } from "@/hooks/use-auth";
import ProviderReviewDashboard from "@/features/reviews/components/provider-review-dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";

export default function ProviderReviewsPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.reviews");

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      {user && <ProviderReviewDashboard providerId={user.id} />}
    </div>
  );
}
