"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Calendar,
  User,
  CreditCard,
  ArrowLeft,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PaymentDetails {
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  sessionId: string;
  booking: {
    id: string;
    providerName: string;
    serviceName: string;
    scheduledDate: string;
    scheduledTime: string;
    location: string;
  };
}

export default function PaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const bookingId = params.id as string;
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      toast.error("Session de paiement introuvable");
      router.push("/client/bookings");
    }
  }, [sessionId, bookingId]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/client/bookings/${bookingId}/payment/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setPaymentDetails(data.payment);
        toast.success("Paiement confirmé avec succès !");
      } else {
        toast.error("Erreur lors de la vérification du paiement");
        router.push("/client/bookings");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast.error("Erreur lors de la vérification");
      router.push("/client/bookings");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async () => {
    try {
      const response = await fetch(
        `/api/client/bookings/${bookingId}/receipt`,
        {
          method: "GET",
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `recu-paiement-${bookingId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Reçu téléchargé");
      } else {
        toast.error("Erreur lors du téléchargement du reçu");
      }
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Erreur lors du téléchargement");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Vérification du paiement..."
          description="Veuillez patienter"
        />
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Vérification de votre paiement en cours...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Paiement introuvable"
          description="Les détails de ce paiement ne sont pas disponibles"
        />
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">
              Impossible de vérifier ce paiement.
            </p>
            <Link href="/client/bookings">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour aux réservations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiement réussi !"
        description="Votre paiement a été traité avec succès"
        action={
          <Link href="/client/bookings">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Mes réservations
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Confirmation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-green-600">
              <CheckCircle className="h-6 w-6 mr-2" />
              Paiement confirmé
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Montant payé:</span>
                <span className="text-xl font-bold text-green-600">
                  {paymentDetails.amount.toFixed(2)}{" "}
                  {paymentDetails.currency.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className="font-medium text-green-600">Payé</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date de paiement:</span>
                <span className="font-medium">
                  {new Date(paymentDetails.paidAt).toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Méthode:</span>
                <span className="font-medium">Carte bancaire (Stripe)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID de transaction:</span>
                <span className="font-mono text-xs">
                  {paymentDetails.sessionId}
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={downloadReceipt}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le reçu
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Détails de la réservation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Prestataire:</span>
              <span className="ml-2">
                {paymentDetails.booking.providerName}
              </span>
            </div>

            <div className="flex items-center text-sm">
              <span className="font-medium">Service:</span>
              <span className="ml-2">{paymentDetails.booking.serviceName}</span>
            </div>

            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Date et heure:</span>
              <span className="ml-2">
                {new Date(
                  paymentDetails.booking.scheduledDate,
                ).toLocaleDateString("fr-FR")}{" "}
                à {paymentDetails.booking.scheduledTime}
              </span>
            </div>

            <div className="flex items-center text-sm">
              <span className="font-medium">Lieu:</span>
              <span className="ml-2">{paymentDetails.booking.location}</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Prochaines étapes
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Le prestataire va être notifié de votre paiement</li>
                <li>• Vous recevrez une confirmation par email</li>
                <li>• Le prestataire vous contactera avant le rendez-vous</li>
                <li>
                  • Vous pourrez suivre votre réservation dans votre espace
                  client
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/client/bookings/${bookingId}`}>
              <Button className="w-full sm:w-auto">Voir la réservation</Button>
            </Link>
            <Link href="/client/services">
              <Button variant="outline" className="w-full sm:w-auto">
                Réserver un autre service
              </Button>
            </Link>
            <Link href="/client">
              <Button variant="outline" className="w-full sm:w-auto">
                Retour au tableau de bord
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
