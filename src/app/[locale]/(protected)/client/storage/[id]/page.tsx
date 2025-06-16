import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeading } from "@/components/ui/page-heading";
import {
  PackageCheck,
  Clock,
  Calendar,
  MapPin,
  Building2,
  ChevronLeft} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@/trpc/server";
import { notFound } from "next/navigation";
import { BoxDetailTabs } from "@/components/client/storage/box-detail-tabs";
import { PageProps, MetadataProps } from "@/server/auth/next-auth";

export async function generateMetadata({
  params}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "storage"  });

  return {
    title: t("detailPage.metaTitle"),
    description: t("detailPage.metaDescription")};
}

export default async function ReservationDetailPage({
  params}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "storage"  });

  // Récupération des données de la réservation
  const cookieStore = await cookies();
  const api = createServerComponentClient({ cookies  });
  const reservation = await api.storage.getReservationById
    .query({ id  })
    .catch(() => null);

  if (!reservation) {
    notFound();
  }

  // Récupération de l'historique d'utilisation
  const usageHistory = await api.storage.getBoxUsageHistory.query({ reservationId  });

  // Formater l'adresse du warehouse
  const warehouseAddress = `${reservation.box.warehouse.address}, ${reservation.box.warehouse.postalCode} ${reservation.box.warehouse.city}`;

  return (
    <Container>
      <div className="mb-6">
        <Button
          variant="ghost"
          className="flex items-center -ml-2 mb-4"
          asChild
        >
          <Link href="/client/storage">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("detailPage.backToReservations")}
          </Link>
        </Button>

        <PageHeading
          title={t("detailPage.title", { boxName: reservation.box.name })}
          description={t("detailPage.warehouseSubtitle", {
            warehouseName: reservation.box.warehouse.name})}
          icon={<PackageCheck className="h-6 w-6" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("detailPage.reservationDetails")}</CardTitle>
              <CardDescription>{t("detailPage.currentStatus")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("detailPage.status")}</span>
                </div>
                <Badge variant={getStatusVariant(reservation.status)}>
                  {t(`statuses.${reservation.status.toLowerCase()}`)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t("detailPage.startDate")}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(reservation.startDate), "PPP", { locale })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t("detailPage.endDate")}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(reservation.endDate), "PPP", { locale })}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <span className="font-medium">
                  {t("detailPage.paymentInfo")}
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("detailPage.totalPaid")}
                    </span>
                    <span className="font-medium">
                      {reservation.totalPrice.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2})}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">
                      {t("detailPage.paymentMethod")}
                    </span>
                    <span>{t("detailPage.cardPayment")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {isActive(reservation.status) && (
                <div className="flex justify-end w-full space-x-3">
                  <Button variant="outline" asChild>
                    <Link href={`/client/storage/${id}/extend`}>
                      {t("detailPage.extendReservation")}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/client/storage/${id}/access`}>
                      {t("detailPage.accessBox")}
                    </Link>
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>

          <BoxDetailTabs box={reservation.box} usageHistory={usageHistory} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("detailPage.warehouseInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-muted rounded-md relative overflow-hidden">
                {/* Carte statique ou image du warehouse */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-16 w-16 text-muted-foreground/50" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="font-medium">
                      {reservation.box.warehouse.name}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {warehouseAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <span className="font-medium">
                      {t("detailPage.openingHours")}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {reservation.box.warehouse.openingHours}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  window.open(
                    `https://maps.google.com/?q=${warehouseAddress}`,
                    "blank",
                  )
                }
              >
                <MapPin className="mr-2 h-4 w-4" />
                {t("detailPage.directions")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Container>
  );
}

// Fonctions utilitaires
function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
    case "EXTENDED":
      return "default";
    case "PENDING":
      return "secondary";
    case "CANCELLED":
    case "OVERDUE":
      return "destructive";
    case "COMPLETED":
    default:
      return "outline";
  }
}

function isActive(status: string): boolean {
  return ["ACTIVE", "EXTENDED"].includes(status);
}
