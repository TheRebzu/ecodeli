"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { loadStripe } from "@stripe/stripe-js";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

// Initialiser Stripe avec la clé publique
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51O9JqzBVQeUXD3XDGQPKZQpKOjKlCIkUKXnOlwTcqXYWLqeGztDU9RNmfOi6Z1YdLWxPLHPzR5kFJQTwkpYQEMGZ00oBRzVmIm",
);

export default function PaymentPage() {
  const t = useTranslations("payment");
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [isRedirecting, setIsRedirecting] = useState(false);

  // Récupérer les détails de la commande
  const {
    data: order,
    isLoading: isLoadingOrder,
    error,
  } = api.order.getOrderById.useQuery(
    { id: orderId as string },
    {
      enabled: !!orderId,
      retry: false,
      onError: (error) => {
        toast.error(error.message);
        router.push("/orders");
      },
    },
  );

  // Mutation pour créer une session de paiement Stripe
  const createCheckoutSession = api.payment.createCheckoutSession.useMutation({
    onSuccess: async (data) => {
      setIsRedirecting(true);

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.sessionId });
        }
      }
    },
    onError: (error) => {
      toast.error(error.message);
      setIsRedirecting(false);
    },
  });

  // Gérer le paiement
  const handlePayment = () => {
    if (!orderId) {
      toast.error(t("orderIdMissing"));
      return;
    }

    setIsRedirecting(true);
    createCheckoutSession.mutate({ orderId });
  };

  // Rediriger si la commande est déjà payée
  useEffect(() => {
    if (order && order.paymentStatus === "COMPLETED") {
      toast.info(t("alreadyPaid"));
      router.push(`/orders/${orderId}`);
    }
  }, [order, orderId, router, t]);

  return (
    <DashboardLayout sidebar={<ClientSidebar />}>
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
          <h1 className="text-3xl font-bold">{t("title")}</h1>
        </div>

        {isLoadingOrder ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive opacity-50 mb-4" />
              <h2 className="text-xl font-medium mb-2">{t("orderNotFound")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("orderNotFoundDescription")}
              </p>
              <Button asChild>
                <Link href="/orders">{t("viewAllOrders")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : !order ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive opacity-50 mb-4" />
              <h2 className="text-xl font-medium mb-2">{t("invalidOrder")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("invalidOrderDescription")}
              </p>
              <Button asChild>
                <Link href="/orders">{t("viewAllOrders")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t("orderSummary")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="font-medium">{t("orderNumber")}</span>
                      <span>#{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{t("store")}</span>
                      <span>{order.store.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{t("date")}</span>
                      <span>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{t("items")}</span>
                      <span>{order.orderItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{t("subtotal")}</span>
                      <span>
                        {(
                          order.totalAmount -
                          order.shippingFee -
                          order.tax
                        ).toFixed(2)}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{t("shipping")}</span>
                      <span>{order.shippingFee.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">{t("tax")}</span>
                      <span>{order.tax.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>{t("total")}</span>
                      <span>{order.totalAmount.toFixed(2)} €</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t("paymentMethod")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/30">
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">{t("creditCard")}</span>
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      {t("securePaymentNotice")}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePayment}
                    disabled={isRedirecting}
                  >
                    {isRedirecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("redirecting")}
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {t("payNow")} ({order.totalAmount.toFixed(2)} €)
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/orders/${orderId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("backToOrder")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
