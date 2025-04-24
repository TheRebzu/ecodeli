import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";

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
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  const t = useTranslations("payments");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  return (
    <DashboardLayout
      title={t("paymentCancelTitle")}
      description={t("paymentCancelDescription")}
    >
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 text-red-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8" />
            </div>
            <CardTitle>{t("paymentCancelled")}</CardTitle>
            <CardDescription>
              {t("paymentCancelMessage")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-500">
              {t("paymentCancelExplanation")}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              className="w-full" 
              onClick={() => router.push(`/announcements/${id}/payment`)}
            >
              {t("tryAgain")}
            </Button>
            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => router.push(`/announcements/${id}`)}
            >
              {t("backToAnnouncement")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
