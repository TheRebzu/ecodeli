"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import DeliveryList from "@/features/client/components/deliveries/delivery-list";

export default function ClientDeliveriesPage() {
  const { user } = useAuth();
  const t = useTranslations("client.deliveries");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">
            {t("auth.required_description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />
      
      <DeliveryList clientId={user.id} />
    </div>
  );
}