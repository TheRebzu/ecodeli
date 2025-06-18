"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ReviewList } from "@/components/client/reviews/review-list";

export default function PendingReviewsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="À évaluer"
        description={t("client.PendingReviews.description")}
      />

      <Card className="p-6">
        <ReviewList
          reviews={[]}
          isLoading={false}
          onCreateNew={() => console.log('Create review')}
        />
      </Card>
    </div>
  );
}
