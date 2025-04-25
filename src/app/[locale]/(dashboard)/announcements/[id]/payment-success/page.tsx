"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { CheckCircle, Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const t = useTranslations("payments");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);

  // Vérifier le statut du paiement
  const { data, isLoading, error } =
    api.announcementPayment.checkPaymentStatus.useQuery(
      { sessionId: sessionId || "" },
      {
        enabled: !!sessionId,
        refetchOnWindowFocus: false,
        retry: 3,
        onSuccess: (data) => {
          setIsVerifying(false);
          if (data.paymentStatus === "PAID") {
            toast.success(t("paymentSuccessful"));
          }
        },
        onError: () => {
          setIsVerifying(false);
        },
      },
    );

  // Rediriger vers l'annonce après quelques secondes
  useEffect(() => {
    if (data?.announcementId && !isVerifying) {
      const timer = setTimeout(() => {
        router.push(`/announcements/${data.announcementId}`);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [data, isVerifying, router]);

  return (
    <DashboardLayout
      title={t("paymentSuccessTitle")}
      description={t("paymentSuccessDescription")}
    >
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 text-green-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <CardTitle>{t("paymentSuccessful")}</CardTitle>
            <CardDescription>{t("paymentSuccessMessage")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isVerifying || isLoading ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-gray-500">{t("verifyingPayment")}</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">
                  {t("paymentVerificationError")}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("contactSupport")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center">{t("redirectingToAnnouncement")}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full animate-progress"></div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() =>
                data?.announcementId
                  ? router.push(`/announcements/${data.announcementId}`)
                  : router.push("/announcements")
              }
            >
              {t("viewAnnouncement")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
