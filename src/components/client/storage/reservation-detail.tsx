"use client";

import { Container } from "@/components/ui/container";
import { PageHeading } from "@/components/ui/page-heading";
import {
  PackageCheck,
  Clock,
  Calendar,
  MapPin,
  Building2,
  ChevronLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BoxDetailTabs } from "@/components/client/storage/box-detail-tabs";
import { useTranslations } from "next-intl";
import { 
  getReservationStatusVariant, 
  isReservationActive,
  formatCurrency 
} from "@/lib/utils/status-utils";

interface ReservationDetailProps {
  reservation: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date;
    totalPrice: number;
    box: {
      id: string;
      name: string;
      size: number;
      boxType: string;
      features?: string[];
      warehouse: {
        id: string;
        name: string;
        address: string;
        postalCode: string;
        city: string;
        openingHours: string;
      };
    };
  };
  usageHistory: any[];
  locale: string;
}

export function ReservationDetail({ 
  reservation, 
  usageHistory, 
  locale 
}: ReservationDetailProps) {
  const t = useTranslations("storage");

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
            warehouseName: reservation.box.warehouse.name,
          })}
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
                <Badge variant={getReservationStatusVariant(reservation.status)}>
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
                      {format(new Date(reservation.startDate), "PPP", {
                        locale: locale === "fr" ? fr : undefined,
                      })}
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
                      {format(new Date(reservation.endDate), "PPP", {
                        locale: locale === "fr" ? fr : undefined,
                      })}
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
                      {formatCurrency(reservation.totalPrice)}
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
              {isReservationActive(reservation.status) && (
                <div className="flex justify-end w-full space-x-3">
                  <Button variant="outline" asChild>
                    <Link href={`/client/storage/${reservation.id}/extend`}>
                      {t("detailPage.extendReservation")}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/client/storage/${reservation.id}/access`}>
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
                    "_blank",
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