"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import BookingList from "@/features/client/components/bookings/booking-list";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ClientBookingsPage() {
  const { user } = useAuth();
  const t = useTranslations("client.bookings");

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
        action={
          <Link href="/client/services">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              {t("page.new_booking")}
            </Button>
          </Link>
        }
      />

      <BookingList clientId={user.id} />
    </div>
  );
}
