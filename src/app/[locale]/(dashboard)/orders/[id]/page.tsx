"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { MerchantSidebar } from "@/components/dashboard/merchant/merchant-sidebar";
import { DelivererSidebar } from "@/components/dashboard/deliverer/deliverer-sidebar";
import { AdminSidebar } from "@/components/dashboard/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Package,
  ArrowLeft,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Receipt,
  CreditCard,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function OrderDetailPage() {
  const t = useTranslations("orders");
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [isUpdating, setIsUpdating] = useState(false);

  // Récupérer les détails de la commande
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = api.order.getOrderById.useQuery(
    { id: params.id as string },
    {
      retry: false,
      onError: (error) => {
        toast.error(error.message);
        router.push("/orders");
      },
    },
  );

  // Mutation pour mettre à jour le statut de la commande
  const updateOrderStatus = api.order.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast.success(t("statusUpdateSuccess"));
      setIsUpdating(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsUpdating(false);
    },
  });

  // Déterminer la barre latérale en fonction du rôle de l'utilisateur
  const getSidebar = () => {
    if (!session?.user.role) return <ClientSidebar />;

    switch (session.user.role) {
      case "CLIENT":
        return <ClientSidebar />;
      case "MERCHANT":
        return <MerchantSidebar />;
      case "DELIVERER":
        return <DelivererSidebar />;
      case "ADMIN":
        return <AdminSidebar />;
      default:
        return <ClientSidebar />;
    }
  };

  // Gérer la mise à jour du statut de la commande
  const handleStatusUpdate = (status: OrderStatus) => {
    if (!order) return;

    setIsUpdating(true);
    updateOrderStatus.mutate({
      id: order.id,
      status,
    });
  };

  // Fonction pour afficher le statut de la commande
  const renderStatus = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" /> {t("status.pending")}
          </Badge>
        );
      case "CONFIRMED":
        return (
          <Badge variant="secondary">
            <CheckCircle className="mr-1 h-3 w-3" /> {t("status.confirmed")}
          </Badge>
        );
      case "PREPARING":
        return (
          <Badge variant="secondary">
            <Package className="mr-1 h-3 w-3" /> {t("status.preparing")}
          </Badge>
        );
      case "READY_FOR_PICKUP":
        return (
          <Badge variant="warning">
            <Package className="mr-1 h-3 w-3" /> {t("status.readyForPickup")}
          </Badge>
        );
      case "IN_TRANSIT":
        return (
          <Badge variant="warning">
            <Truck className="mr-1 h-3 w-3" /> {t("status.inTransit")}
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" /> {t("status.delivered")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> {t("status.cancelled")}
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge variant="destructive">
            <CreditCard className="mr-1 h-3 w-3" /> {t("status.refunded")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Fonction pour afficher le statut du paiement
  const renderPaymentStatus = (status: PaymentStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" /> {t("paymentStatus.pending")}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" />{" "}
            {t("paymentStatus.completed")}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" /> {t("paymentStatus.failed")}
          </Badge>
        );
      case "REFUNDED":
        return (
          <Badge variant="destructive">
            <CreditCard className="mr-1 h-3 w-3" />{" "}
            {t("paymentStatus.refunded")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Fonction pour afficher les actions disponibles en fonction du rôle et du statut
  const renderActions = () => {
    if (!order || !session?.user.role) return null;

    switch (session.user.role) {
      case "CLIENT":
        // Les clients peuvent annuler uniquement les commandes en attente
        if (order.status === "PENDING") {
          return (
            <Button
              variant="destructive"
              onClick={() => handleStatusUpdate("CANCELLED")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t("cancelOrder")}
            </Button>
          );
        }
        return null;

      case "MERCHANT":
        // Les commerçants peuvent mettre à jour le statut des commandes
        if (["PENDING", "CONFIRMED", "PREPARING"].includes(order.status)) {
          return (
            <div className="flex space-x-2">
              {order.status === "PENDING" && (
                <Button
                  variant="default"
                  onClick={() => handleStatusUpdate("CONFIRMED")}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {t("confirmOrder")}
                </Button>
              )}

              {order.status === "CONFIRMED" && (
                <Button
                  variant="default"
                  onClick={() => handleStatusUpdate("PREPARING")}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="mr-2 h-4 w-4" />
                  )}
                  {t("startPreparation")}
                </Button>
              )}

              {order.status === "PREPARING" && (
                <Button
                  variant="default"
                  onClick={() => handleStatusUpdate("READY_FOR_PICKUP")}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="mr-2 h-4 w-4" />
                  )}
                  {t("readyForPickup")}
                </Button>
              )}

              {["PENDING", "CONFIRMED"].includes(order.status) && (
                <Button
                  variant="destructive"
                  onClick={() => handleStatusUpdate("CANCELLED")}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  {t("cancelOrder")}
                </Button>
              )}
            </div>
          );
        }
        return null;

      case "DELIVERER":
        // Les livreurs peuvent mettre à jour le statut des commandes en cours de livraison
        if (order.status === "READY_FOR_PICKUP") {
          return (
            <Button
              variant="default"
              onClick={() => handleStatusUpdate("IN_TRANSIT")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4" />
              )}
              {t("startDelivery")}
            </Button>
          );
        } else if (order.status === "IN_TRANSIT") {
          return (
            <Button
              variant="success"
              onClick={() => handleStatusUpdate("DELIVERED")}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {t("completeDelivery")}
            </Button>
          );
        }
        return null;

      case "ADMIN":
        // Les admins peuvent mettre à jour n'importe quel statut
        return (
          <div className="flex flex-wrap gap-2">
            {order.status !== "CONFIRMED" && (
              <Button
                variant="default"
                onClick={() => handleStatusUpdate("CONFIRMED")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.confirmed")}
              </Button>
            )}

            {order.status !== "PREPARING" && (
              <Button
                variant="default"
                onClick={() => handleStatusUpdate("PREPARING")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.preparing")}
              </Button>
            )}

            {order.status !== "READY_FOR_PICKUP" && (
              <Button
                variant="default"
                onClick={() => handleStatusUpdate("READY_FOR_PICKUP")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.readyForPickup")}
              </Button>
            )}

            {order.status !== "IN_TRANSIT" && (
              <Button
                variant="default"
                onClick={() => handleStatusUpdate("IN_TRANSIT")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.inTransit")}
              </Button>
            )}

            {order.status !== "DELIVERED" && (
              <Button
                variant="success"
                onClick={() => handleStatusUpdate("DELIVERED")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.delivered")}
              </Button>
            )}

            {order.status !== "CANCELLED" && (
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate("CANCELLED")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.cancelled")}
              </Button>
            )}

            {order.status !== "REFUNDED" && (
              <Button
                variant="destructive"
                onClick={() => handleStatusUpdate("REFUNDED")}
                disabled={isUpdating}
                size="sm"
              >
                {t("status.refunded")}
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DashboardLayout sidebar={getSidebar()}>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
          <h1 className="text-3xl font-bold">
            {t("orderDetails")}
            {order && (
              <span className="text-muted-foreground ml-2">
                #{order.orderNumber}
              </span>
            )}
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !order ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
              <h2 className="text-xl font-medium mb-2">{t("orderNotFound")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("orderNotFoundDescription")}
              </p>
              <Button asChild>
                <Link href="/orders">{t("viewAllOrders")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("orderStatus")}</CardTitle>
                <div className="flex items-center space-x-2">
                  {renderStatus(order.status)}
                  {renderPaymentStatus(order.paymentStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">{t("orderInfo")}</h3>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">
                          {t("orderNumber")}:
                        </span>{" "}
                        #{order.orderNumber}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("orderDate")}:
                        </span>{" "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("lastUpdate")}:
                        </span>{" "}
                        {new Date(order.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">{t("customer")}</h3>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">
                          {t("name")}:
                        </span>{" "}
                        {order.client.name}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("email")}:
                        </span>{" "}
                        {order.client.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">{t("store")}</h3>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">
                          {t("name")}:
                        </span>{" "}
                        {order.store.name}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("address")}:
                        </span>{" "}
                        {order.store.address}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          {t("city")}:
                        </span>{" "}
                        {order.store.city}, {order.store.postalCode}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2 flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      {t("shippingAddress")}
                    </h3>
                    <div className="text-sm whitespace-pre-line border p-3 rounded-md bg-muted/30">
                      {order.shippingAddress}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2 flex items-center">
                      <Receipt className="mr-2 h-4 w-4" />
                      {t("orderNotes")}
                    </h3>
                    <div className="text-sm border p-3 rounded-md bg-muted/30 min-h-[80px]">
                      {order.notes || t("noNotes")}
                    </div>
                  </div>
                </div>

                {order.delivery && (
                  <>
                    <Separator className="my-6" />

                    <div>
                      <h3 className="font-medium mb-2 flex items-center">
                        <Truck className="mr-2 h-4 w-4" />
                        {t("deliveryInfo")}
                      </h3>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">
                            {t("deliveryStatus")}:
                          </span>{" "}
                          {order.delivery.status}
                        </p>
                        {order.delivery.startTime && (
                          <p>
                            <span className="text-muted-foreground">
                              {t("startTime")}:
                            </span>{" "}
                            {new Date(
                              order.delivery.startTime,
                            ).toLocaleString()}
                          </p>
                        )}
                        {order.delivery.endTime && (
                          <p>
                            <span className="text-muted-foreground">
                              {t("endTime")}:
                            </span>{" "}
                            {new Date(order.delivery.endTime).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>{renderActions()}</CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("orderItems")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b pb-4"
                    >
                      <div className="flex items-center space-x-4">
                        {item.product.imageUrl ? (
                          <div className="h-16 w-16 rounded-md overflow-hidden relative">
                            <Image
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                            <Package className="h-8 w-8" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t("unitPrice")}: {item.unitPrice.toFixed(2)} €
                          </p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground">
                              {t("notes")}: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-medium">
                          {item.totalPrice.toFixed(2)} €
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("quantity")}: {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("subtotal")}</span>
                    <span>
                      {(
                        order.totalAmount -
                        order.shippingFee -
                        order.tax
                      ).toFixed(2)}{" "}
                      €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("shipping")}</span>
                    <span>{order.shippingFee.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("tax")}</span>
                    <span>{order.tax.toFixed(2)} €</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>{t("total")}</span>
                    <span>{order.totalAmount.toFixed(2)} €</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.payments && order.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("paymentInfo")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">
                            {t(`paymentType.${payment.type.toLowerCase()}`)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                          {payment.externalId && (
                            <p className="text-xs text-muted-foreground">
                              ID: {payment.externalId}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {payment.amount.toFixed(2)} €
                          </p>
                          <p>{renderPaymentStatus(payment.status)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
