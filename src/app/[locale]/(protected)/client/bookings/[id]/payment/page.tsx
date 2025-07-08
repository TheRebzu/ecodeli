"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, User, CreditCard, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BookingDetails {
  id: string;
  providerName: string;
  serviceType: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  price: number;
  status: string;
  notes?: string;
  payment?: {
    status: string;
    amount: number;
  } | null;
  isPaid?: boolean;
}

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("client.bookings");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const bookingId = params.id as string;

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      
      const apiUrl = `/api/client/bookings/${bookingId}`;
      console.log('🔗 [Payment Page] Fetching from URL:', apiUrl);
      console.log('🔗 [Payment Page] Booking ID:', bookingId);
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('📝 [Payment Page] API Response:', data);
        console.log('📝 [Payment Page] Booking data:', data.booking);
        
        setBooking(data.booking);
        
        // Redirect if already paid
        if (data.booking?.isPaid) {
          toast.info("Cette réservation est déjà payée");
          router.push("/client/bookings");
          return;
        }
      } else {
        console.error('❌ [Payment Page] API Error:', response.status, response.statusText);
        toast.error("Impossible de charger les détails de la réservation");
        router.push("/client/bookings");
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
      toast.error("Erreur lors du chargement");
      router.push("/client/bookings");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;

    try {
      setPaying(true);
      
      // Create Stripe checkout session
      const response = await fetch(`/api/client/bookings/${bookingId}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: booking.price,
          currency: "EUR",
          bookingId: booking.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Redirect to Stripe checkout
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          toast.error("Erreur lors de la création du paiement");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors du paiement");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Erreur lors du traitement du paiement");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Paiement en cours..."
          description="Chargement des détails"
        />
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    console.log('❌ [Payment Page] Booking is null/undefined:', booking);
    console.log('❌ [Payment Page] Loading state:', loading);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Réservation introuvable"
          description="Cette réservation n'existe pas ou n'est plus disponible"
        />
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-600 mb-4">
              La réservation demandée est introuvable.
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: "En attente" },
      confirmed: { color: "bg-blue-100 text-blue-800", label: "Confirmé" },
      in_progress: { color: "bg-purple-100 text-purple-800", label: "En cours" },
      completed: { color: "bg-green-100 text-green-800", label: "Terminé" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Annulé" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiement du service"
        description="Finalisez le paiement de votre réservation"
        action={
          <Link href="/client/bookings">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Détails de la réservation</span>
              {getStatusBadge(booking.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Prestataire:</span>
              <span className="ml-2">{booking.providerName}</span>
            </div>

            <div className="flex items-center text-sm">
              <span className="font-medium">Service:</span>
              <span className="ml-2">{booking.serviceName || booking.serviceType}</span>
            </div>

            <div className="flex items-center text-sm">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Date:</span>
              <span className="ml-2">
                {new Date(booking.scheduledDate).toLocaleDateString("fr-FR")} à {booking.scheduledTime}
              </span>
            </div>

            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Lieu:</span>
              <span className="ml-2">{booking.location}</span>
            </div>

            {booking.notes && (
              <div className="p-3 bg-gray-50 rounded">
                <span className="font-medium text-sm">Notes:</span>
                <p className="text-sm text-gray-700 mt-1">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Récapitulatif du paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-t border-b py-4 space-y-2">
              <div className="flex justify-between items-center">
                <span>Montant du service</span>
                <span className="font-medium">{booking.price.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Frais de traitement</span>
                <span className="font-medium">0,00 €</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total à payer</span>
              <span className="text-green-600">{booking.price.toFixed(2)} €</span>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handlePayment}
                disabled={paying}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {paying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer {booking.price.toFixed(2)} €
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Paiement sécurisé via Stripe. Vos données de carte sont protégées.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 