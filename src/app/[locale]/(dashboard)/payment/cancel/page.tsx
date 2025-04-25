"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { XCircle, ArrowLeft, ShoppingBag, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  const t = useTranslations("payment");
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  // Récupérer les détails de la commande si disponible
  const { data: order, isLoading } = api.order.getOrderById.useQuery(
    { id: orderId as string },
    {
      enabled: !!orderId,
      retry: false,
      onError: () => {
        // Ignorer les erreurs ici
      },
    },
  );

  // Gérer la reprise du paiement
  const handleRetryPayment = () => {
    if (orderId) {
      router.push(`/payment?orderId=${orderId}`);
    } else {
      toast.error(t("orderNotFound"));
      router.push("/orders");
    }
  };

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">{t("paymentCancelled")}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <XCircle className="mr-2 h-5 w-5" />
              {t("paymentCancelled")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{t("paymentCancelledDescription")}</p>

            {order && (
              <div className="bg-muted/30 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{t("orderNumber")}</span>
                  <span>#{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t("store")}</span>
                  <span>{order.store.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t("total")}</span>
                  <span>{order.totalAmount.toFixed(2)} €</span>
                </div>
              </div>
            )}

            <p className="text-muted-foreground">{t("paymentCancelledHelp")}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href={orderId ? `/orders/${orderId}` : "/orders"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("backToOrder")}
              </Link>
            </Button>

            <Button onClick={handleRetryPayment}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t("retryPayment")}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="outline" asChild>
            <Link href="/stores">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {t("continueShopping")}
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
