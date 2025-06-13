"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";

export default function BlogPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Blog" description={t("public.Blog.description")} />

      <Card className="p-6">
        <p className="text-muted-foreground">
          Blog - En cours de développement
        </p>
      </Card>
    </div>
  );
}
