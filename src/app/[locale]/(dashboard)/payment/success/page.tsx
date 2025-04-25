"use client";

import { useEffect } from "react";
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
import { CheckCircle, ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
  const t = useTranslations("payment");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // Vérifier le statut du paiement
  const { data, isLoading, error } = api.payment.checkPaymentStatus.useQuery(
    { sessionId: sessionId as string },
    {
      enabled: !!sessionId,
      retry: false,
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  // Rediriger vers la page de commande si le paiement est confirmé
  useEffect(() => {
    if (data && data.paymentStatus === "paid" && data.orderId) {
      // Attendre un peu pour que l'utilisateur puisse voir la confirmation
      const timer = setTimeout(() => {
        router.push(`/orders/${data.orderId}`);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [data, router]);

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">{t("paymentSuccess")}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-success">
              <CheckCircle className="mr-2 h-5 w-5" />
              {t("paymentSuccessful")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{t("paymentSuccessDescription")}</p>

            {data && (
              <div className="bg-muted/30 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{t("amount")}</span>
                  <span>{data.amountTotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t("email")}</span>
                  <span>{data.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t("paymentId")}</span>
                  <span className="font-mono text-sm">
                    {data.paymentIntent}
                  </span>
                </div>
              </div>
            )}

            <p className="text-muted-foreground">{t("redirectingToOrder")}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/orders">{t("viewAllOrders")}</Link>
            </Button>

            <Button asChild>
              <Link
                href={data?.orderId ? `/orders/${data.orderId}` : "/orders"}
              >
                {t("viewOrder")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
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
