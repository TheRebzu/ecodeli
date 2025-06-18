import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@/trpc/server";
import { notFound } from "next/navigation";
import { ReservationDetail } from "@/components/client/storage/reservation-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "storage" });

  return {
    title: t("detailPage.metaTitle"),
    description: t("detailPage.metaDescription"),
  };
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  // Récupération des données de la réservation
  const cookieStore = await cookies();
  const api = createServerComponentClient({ cookies: cookieStore });
  const reservation = await api.storage.getReservationById
    .query({ id })
    .catch(() => null);

  if (!reservation) {
    notFound();
  }

  // Récupération de l'historique d'utilisation
  const usageHistory = await api.storage.getBoxUsageHistory.query({ 
    reservationId: id 
  });

  return (
    <ReservationDetail
      reservation={reservation}
      usageHistory={usageHistory}
      locale={locale}
    />
  );
}
