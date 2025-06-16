"use client";

import { useBoxReservations } from "@/hooks/common/use-storage";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Building2,
  AlertTriangle,
  PackageCheck,
  KeyRound,
  Hourglass,
  CalendarClock,
  ClipboardCheck,
  ArrowRight,
  Ban,
  ShieldCheck} from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationWithBoxAndWarehouse } from "@/types/warehouses/storage-box";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/common";
import { useRouter } from "next/navigation";

// Importation dynamique des composants de dialogue
import dynamic from "next/dynamic";

// Définition des types pour les composants dynamiques
type ExtendReservationDialogProps = {
  reservation: ReservationWithBoxAndWarehouse;
  open: boolean;
  onClose: () => void;
};

type AccessBoxDialogProps = {
  reservation: ReservationWithBoxAndWarehouse;
  open: boolean;
  onClose: () => void;
};

const ExtendReservationDialog = dynamic<ExtendReservationDialogProps>(
  () =>
    import("./extend-reservation-dialog").then(
      (mod) => mod.ExtendReservationDialog,
    ),
  { ssr },
);

const AccessBoxDialog = dynamic<AccessBoxDialogProps>(
  () => import("./access-box-dialog").then((mod) => mod.AccessBoxDialog),
  { ssr },
);

export function BoxReservations() {
  const t = useTranslations("storage");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ACTIVE");
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationWithBoxAndWarehouse | null>(null);
  const [dialogOpen, setDialogOpen] = useState<"extend" | "access" | null>(
    null,
  );

  // Récupération des réservations du client
  const { reservations, isLoading } = useBoxReservations(activeTab);

  // Debug: log pour voir ce qui est retourné
  console.log(
    "reservations:",
    reservations,
    "type:",
    typeof reservations,
    "isArray:",
    Array.isArray(reservations),
  );

  if (isLoading) {
    return <ReservationsSkeleton />;
  }

  // Assurer que reservations est un array
  const reservationsList = Array.isArray(reservations) ? reservations : [];

  // Si aucune réservation n'est trouvée
  if (!reservationsList || reservationsList.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t("reservations.title")}</CardTitle>
          <CardDescription>
            {t("reservations.noReservationsFound")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="text-center space-y-3">
            <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium text-lg">
              {t("reservations.noReservations")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("reservations.startSearching")}
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/client/storage/search")}
            >
              {t("reservations.findBox")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fonction pour obtenir le libellé de statut traduit
  const getStatusLabel = (status: string) => {
    try {
      // @ts-expect-error Les types de l'API de traduction ne sont pas correctement définis
      return t.raw?.statuses?.[status.toLowerCase()] || status;
    } catch {
      return status;
    }
  };

  // Fonction pour obtenir la variante de badge selon le statut
  const getStatusBadgeVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
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
  };

  // Fonction pour obtenir l'icône de statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <ShieldCheck className="h-4 w-4" />;
      case "PENDING":
        return <Hourglass className="h-4 w-4" />;
      case "COMPLETED":
        return <ClipboardCheck className="h-4 w-4" />;
      case "CANCELLED":
        return <Ban className="h-4 w-4" />;
      case "OVERDUE":
        return <AlertTriangle className="h-4 w-4" />;
      case "EXTENDED":
        return <CalendarClock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Fonction de rendu pour chaque carte de réservation
  const renderReservationCard = (
    reservation: ReservationWithBoxAndWarehouse,
  ) => {
    const { box, startDate, endDate, status, totalPrice } = reservation;
    const today = new Date();
    const isActive = ["ACTIVE", "EXTENDED"].includes(status);
    const isExpiringSoon =
      isActive &&
      endDate &&
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 3;

    return (
      <Card
        key={reservation.id}
        className={cn(
          "transition-all duration-200",
          isExpiringSoon && "border-orange-400",
        )}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{box.name}</span>
                <Badge
                  variant={getStatusBadgeVariant(status)}
                  className="ml-2 flex items-center gap-1"
                >
                  {getStatusIcon(status)}
                  {getStatusLabel(status)}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {box.warehouse.name}
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="font-medium text-lg">
                {totalPrice.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2})}
              </span>
              <p className="text-xs text-muted-foreground">
                {t("reservations.totalPrice")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t("reservations.startDate")}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(startDate, "PPP", { locale })}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {t("reservations.endDate")}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(endDate, "PPP", { locale })}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="text-xs text-muted-foreground">
              {t("reservations.boxDetails")}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium">{t("reservations.size")}:</span>
                <span>{box.size} m³</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{t("reservations.type")}:</span>
                <span>{t(`boxTypes.${box.boxType.toLowerCase()}`)}</span>
              </div>
            </div>
          </div>

          {isExpiringSoon && (
            <div className="mt-4 p-2 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 rounded-md flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("reservations.expiringSoon")}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedReservation(reservation);
              setDialogOpen("access");
            }}
            disabled={!isActive}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            {t("reservations.access")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedReservation(reservation);
              setDialogOpen("extend");
            }}
            disabled={!isActive}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {t("reservations.extend")}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("reservations.title")}
        </h2>
        <Button onClick={() => router.push("/client/storage/search")}>
          {t("reservations.findBox")}
        </Button>
      </div>

      <Tabs
        defaultValue="ACTIVE"
        className="w-full"
        onValueChange={setActiveTab}
      >
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="ACTIVE">{t("reservations.active")}</TabsTrigger>
          <TabsTrigger value="COMPLETED">
            {t("reservations.completed")}
          </TabsTrigger>
          <TabsTrigger value="CANCELLED">
            {t("reservations.cancelled")}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="space-y-4">
            {reservationsList.map(
              (reservation: ReservationWithBoxAndWarehouse) =>
                renderReservationCard(reservation),
            )}
          </div>
        </ScrollArea>
      </Tabs>

      {/* Dialogs pour l'extension et l'accès aux box */}
      {selectedReservation && dialogOpen === "extend" && (
        <ExtendReservationDialog
          reservation={selectedReservation}
          open={dialogOpen === "extend"}
          onClose={() => setDialogOpen(null)}
        />
      )}

      {selectedReservation && dialogOpen === "access" && (
        <AccessBoxDialog
          reservation={selectedReservation}
          open={dialogOpen === "access"}
          onClose={() => setDialogOpen(null)}
        />
      )}
    </div>
  );
}

function ReservationsSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />

        <div className="space-y-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-9 w-28" />
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
