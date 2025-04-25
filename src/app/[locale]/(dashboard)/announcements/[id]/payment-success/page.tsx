"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { DashboardLayout, DashboardHeader } from "@/components/dashboard/dashboard-layout";
import { CheckCircle, Loader2 } from "lucide-react";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";

export default function PaymentSuccessPage() {
  const t = useTranslations("payments");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);

  // Simulate payment verification - in a real app this would be handled by the API
  useEffect(() => {
    if (sessionId) {
      // Simulate API request delay
      const timer = setTimeout(() => {
        setIsVerifying(false);
        toast.success(t("paymentSuccessful"));
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [sessionId, t]);

  // Redirect to announcements after a few seconds
  useEffect(() => {
    if (!isVerifying) {
      const timer = setTimeout(() => {
        router.push("/announcements");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVerifying, router]);

  return (
    <DashboardLayout
      sidebar={<ClientSidebar />}
      header={
        <DashboardHeader
          title={t("paymentSuccessTitle")}
          description={t("paymentSuccessDescription")}
        />
      }
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
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-gray-500">{t("verifyingPayment")}</p>
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
              onClick={() => router.push("/announcements")}
            >
              {t("viewAnnouncements")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
