"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  CreditCardIcon,
  ArrowLeftIcon,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function PaymentSuccessContent() {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "processing" | "error"
  >("processing");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const paymentIntent = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!paymentIntent) {
          setPaymentStatus("error");
          setLoading(false);
          return;
        }

        // Appel à l'API pour vérifier le statut du paiement
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntent,
            redirectStatus,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setPaymentStatus("success");
          setBookingId(data.bookingId);
          toast({
            title: "Paiement réussi !",
            description: "Votre réservation a été confirmée.",
          });
        } else {
          setPaymentStatus("error");
          toast({
            title: "Erreur de paiement",
            description: data.error || "Une erreur est survenue lors du paiement.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du paiement:", error);
        setPaymentStatus("error");
        toast({
          title: "Erreur",
          description: "Impossible de vérifier le statut du paiement.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntent, redirectStatus, toast]);

  const handleGoToBooking = () => {
    if (bookingId) {
      router.push(`/client/bookings/${bookingId}`);
    } else {
      router.push("/client/bookings");
    }
  };

  const handleGoToBookings = () => {
    router.push("/client/bookings");
  };

  const handleGoHome = () => {
    router.push("/client");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Traitement du paiement...
            </h2>
            <p className="text-gray-600">
              Veuillez patienter pendant que nous vérifions votre paiement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          {paymentStatus === "success" ? (
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : paymentStatus === "error" ? (
            <CreditCardIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          ) : (
            <Loader2 className="h-16 w-16 animate-spin text-blue-500 mx-auto mb-4" />
          )}
          
          <CardTitle className="text-2xl font-bold">
            {paymentStatus === "success"
              ? "Paiement réussi !"
              : paymentStatus === "error"
              ? "Erreur de paiement"
              : "Traitement en cours..."}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {paymentStatus === "success" && (
            <>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Votre paiement a été traité avec succès et votre réservation
                  est confirmée.
                </p>
                {bookingId && (
                  <p className="text-sm text-gray-500">
                    Numéro de réservation : {bookingId}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Button onClick={handleGoToBooking} className="w-full">
                  Voir ma réservation
                </Button>
                <Button
                  onClick={handleGoToBookings}
                  variant="outline"
                  className="w-full"
                >
                  Toutes mes réservations
                </Button>
              </div>
            </>
          )}

          {paymentStatus === "error" && (
            <>
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Une erreur est survenue lors du traitement de votre paiement.
                  Veuillez réessayer ou contacter notre support.
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={handleGoToBookings} className="w-full">
                  Retour aux réservations
                </Button>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </div>
            </>
          )}

          {paymentStatus === "processing" && (
            <div className="text-center">
              <p className="text-gray-600">
                Votre paiement est en cours de traitement. Cela peut prendre
                quelques instants.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Chargement...
            </h2>
            <p className="text-gray-600">
              Préparation de la page de paiement.
            </p>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
