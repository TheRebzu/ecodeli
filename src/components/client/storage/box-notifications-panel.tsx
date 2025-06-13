"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { BoxSearchInput } from "@/schemas/storage/storage.schema";
import { BoxSearchForm } from "@/components/client/storage/box-search";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CalendarDays,
  MapPin,
  Trash2,
  Package,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BoxAvailabilitySubscription } from "@/types/warehouses/storage-box";

export function BoxNotificationsPanel() {
  const t = useTranslations("storage");
  const [activeTab, setActiveTab] = useState("active");
  const [subscriptionToDelete, setSubscriptionToDelete] =
    useState<BoxAvailabilitySubscription | null>(null);

  // Récupération des données de souscriptions
  const subscriptionsQuery = api.storage.getMySubscriptions.useQuery();
  const createSubscriptionMutation =
    api.storage.subscribeToAvailability.useMutation({
      onSuccess: () => {
        subscriptionsQuery.refetch();
      },
    });
  const deleteSubscriptionMutation =
    api.storage.deactivateSubscription.useMutation({
      onSuccess: () => {
        subscriptionsQuery.refetch();
      },
    });

  // Gestionnaire de création d'une notification
  const handleCreateNotification = async (data: BoxSearchInput) => {
    try {
      await createSubscriptionMutation.mutateAsync({
        startDate: data.startDate,
        endDate: data.endDate,
        warehouseId: data.warehouseId,
        boxType: data.boxType,
        minSize: data.minSize,
        maxPrice: data.maxPrice,
        notificationPreferences: {
          email: true,
          push: true,
          sms: false,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la création de la notification:", error);
    }
  };

  // Gestionnaire de suppression d'une notification
  const handleDeleteNotification = async () => {
    if (!subscriptionToDelete) return;

    try {
      await deleteSubscriptionMutation.mutateAsync({
        subscriptionId: subscriptionToDelete.id,
      });
      setSubscriptionToDelete(null);
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
    }
  };

  if (subscriptionsQuery.isLoading) {
    return <NotificationsSkeleton />;
  }

  // Extraire les données avec une valeur par défaut
  const subscriptions = subscriptionsQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("notifications.title")}
        </h2>
      </div>

      <Tabs defaultValue="active" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="active">
            {t("notifications.activeTab")}
          </TabsTrigger>
          <TabsTrigger value="create">
            {t("notifications.createTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {Array.isArray(subscriptions) && subscriptions.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-4">
                {subscriptions.map((sub: BoxAvailabilitySubscription) => (
                  <Card key={sub.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">
                            {t("notifications.availabilityAlert")}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSubscriptionToDelete(sub)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <CardDescription>
                        {t("notifications.createdAt", {
                          date: format(new Date(sub.createdAt), "PPP", {
                            locale: fr,
                          }),
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <span className="font-medium">
                              {t("notifications.dateRange")}:
                            </span>{" "}
                            {format(new Date(sub.startDate), "P", {
                              locale: fr,
                            })}{" "}
                            -{" "}
                            {format(new Date(sub.endDate), "P", { locale: fr })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <span className="font-medium">
                              {t("notifications.location")}:
                            </span>{" "}
                            {sub.location || t("notifications.anyLocation")},{" "}
                            {sub.radius
                              ? t("notifications.radius", {
                                  radius: sub.radius,
                                })
                              : ""}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm">
                            <span className="font-medium">
                              {t("notifications.boxDetails")}:
                            </span>{" "}
                            {sub.boxType
                              ? t(`boxTypes.${sub.boxType.toLowerCase()}`)
                              : t("notifications.anyType")}
                            {sub.minSize && sub.maxSize
                              ? `, ${sub.minSize}-${sub.maxSize} m³`
                              : sub.minSize
                                ? `, ${t("notifications.minSize", { size: sub.minSize })}`
                                : sub.maxSize
                                  ? `, ${t("notifications.maxSize", { size: sub.maxSize })}`
                                  : ""}
                          </div>
                        </div>

                        {sub.features && sub.features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {sub.features.map((feature: string) => (
                              <div
                                key={feature}
                                className="bg-secondary px-2 py-1 rounded-md text-xs"
                              >
                                {t(`features.${feature.toLowerCase()}`)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("notifications.noNotificationsTitle")}</AlertTitle>
              <AlertDescription>
                {t("notifications.noNotificationsDesc")}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{t("notifications.createTitle")}</CardTitle>
              <CardDescription>
                {t("notifications.createDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BoxSearchForm
                onSearch={handleCreateNotification}
                isSubmitting={createSubscriptionMutation.isPending}
                submitText={t("notifications.createButton")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog
        open={!!subscriptionToDelete}
        onOpenChange={(open) => !open && setSubscriptionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("notifications.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notifications.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNotification}
              disabled={deleteSubscriptionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("notifications.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-52" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
