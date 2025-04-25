import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, CreditCard, AlertTriangle } from "lucide-react";

// Récupérer la clé publique Stripe depuis les variables d'environnement
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

export function AnnouncementPayment() {
  const t = useTranslations("payments");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isProcessing, setIsProcessing] = useState(false);

  // Récupérer les détails de l'annonce
  const {
    data: announcement,
    isLoading,
    error,
  } = api.announcement.getById.useQuery(
    { id },
    {
      enabled: !!id,
      refetchOnWindowFocus: false,
    },
  );

  // Mutation pour créer une session de paiement
  const createPaymentSession =
    api.announcementPayment.createPaymentSession.useMutation({
      onSuccess: async (data) => {
        // Rediriger vers Stripe Checkout
        const stripe = await stripePromise;
        if (stripe) {
          setIsProcessing(true);

          // Rediriger vers l'URL de Stripe Checkout
          window.location.href = data.url;
        } else {
          toast.error(t("stripeLoadError"));
          setIsProcessing(false);
        }
      },
      onError: (error) => {
        toast.error(error.message);
        setIsProcessing(false);
      },
    });

  // Gérer le paiement
  const handlePayment = async () => {
    if (!id) return;

    setIsProcessing(true);
    createPaymentSession.mutate({ announcementId: id });
  };

  // Calculer les frais de service et le montant total
  const serviceFee = announcement ? announcement.price * 0.1 : 0; // 10% de frais de service
  const totalAmount = announcement ? announcement.price + serviceFee : 0;

  // Afficher un état de chargement
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Afficher un message d'erreur
  if (error || !announcement) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-medium">{t("announcementNotFound")}</p>
        <p className="text-gray-500 mt-2">
          {t("announcementNotFoundDescription")}
        </p>
        <Button className="mt-4" onClick={() => router.push("/announcements")}>
          {t("backToAnnouncements")}
        </Button>
      </Card>
    );
  }

  // Vérifier si l'annonce a déjà été payée
  if (announcement.paymentStatus === "PAID") {
    return (
      <Card className="p-8 text-center">
        <div className="bg-green-100 text-green-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium">{t("alreadyPaid")}</p>
        <p className="text-gray-500 mt-2">{t("alreadyPaidDescription")}</p>
        <Button
          className="mt-4"
          onClick={() => router.push(`/announcements/${id}`)}
        >
          {t("viewAnnouncement")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t("payForAnnouncement")}</CardTitle>
        <CardDescription>{t("paymentDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">{announcement.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">
              {announcement.description}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{t("announcementPrice")}</span>
              <span>{announcement.price.toFixed(2)}€</span>
            </div>

            <div className="flex justify-between">
              <span>{t("serviceFee")}</span>
              <span>{serviceFee.toFixed(2)}€</span>
            </div>

            <Separator />

            <div className="flex justify-between font-bold">
              <span>{t("total")}</span>
              <span>{totalAmount.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isProcessing ? t("processing") : t("payNow")}
        </Button>
      </CardFooter>
    </Card>
  );
}
