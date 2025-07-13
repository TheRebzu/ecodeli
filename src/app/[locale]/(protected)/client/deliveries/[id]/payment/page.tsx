"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, User, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PaymentForm } from "@/components/payments/payment-form";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface DeliveryPaymentData {
  delivery: {
    id: string;
    status: string;
    price: number;
    title: string;
    deliverer: {
      name: string;
      rating: number;
    };
  };
  payment: {
    id: string;
    clientSecret: string;
    amount: number;
    currency: string;
    status: string;
  } | null;
  announcement: {
    id: string;
    status: string;
  };
}

export default function DeliveryPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [deliveryData, setDeliveryData] = useState<DeliveryPaymentData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
    null,
  );

  const deliveryId = params.id as string;

  useEffect(() => {
    fetchDeliveryInfo();
  }, [deliveryId]);

  const fetchDeliveryInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les informations de livraison
      const response = await fetch(
        `/api/client/deliveries/${deliveryId}/payment`,
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch delivery info");
      }

      const data = await response.json();
      setDeliveryData(data);

      // Si aucun paiement n'existe, en créer un
      if (!data.payment) {
        await createPaymentIntent();
      } else {
        setPaymentClientSecret(data.payment.clientSecret);
      }
    } catch (err) {
      console.error("Error fetching delivery info:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const createPaymentIntent = async () => {
    try {
      const response = await fetch(
        `/api/client/deliveries/${deliveryId}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment");
      }

      const data = await response.json();
      setPaymentClientSecret(data.payment.clientSecret);

      // Mettre à jour les données de livraison
      await fetchDeliveryInfo();
    } catch (err) {
      console.error("Error creating payment intent:", err);
      setError(err instanceof Error ? err.message : "Failed to create payment");
    }
  };

  const handlePaymentSuccess = () => {
    // Rediriger vers le suivi de livraison
    router.push(`/client/deliveries/${deliveryId}/tracking`);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">
                  Chargement des informations de paiement...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-red-500 text-lg mb-4">❌ Erreur</div>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="space-x-4">
                  <Button variant="outline" onClick={() => router.back()}>
                    Retour
                  </Button>
                  <Button onClick={fetchDeliveryInfo}>Réessayer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!deliveryData) {
    return null;
  }

  const { delivery, payment, announcement } = deliveryData;

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Paiement de livraison</h1>
            <p className="text-gray-600">
              Confirmez votre paiement pour démarrer la livraison
            </p>
          </div>
        </div>

        {/* Informations de livraison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Détails de la livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{delivery.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{delivery.status}</Badge>
                  <Badge variant="outline">{announcement.status}</Badge>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{delivery.deliverer.name}</p>
                    <p className="text-sm text-gray-600">
                      Note: ⭐ {delivery.deliverer.rating}/5
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {delivery.price.toFixed(2)} €
                  </p>
                  <p className="text-sm text-gray-500">Prix de la livraison</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire de paiement */}
        {paymentClientSecret && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Paiement sécurisé
              </CardTitle>
              <CardDescription>
                Votre paiement sera retenu jusqu'à la livraison confirmée.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: paymentClientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#2563eb",
                    },
                  },
                }}
              >
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  amount={delivery.price}
                  currency="EUR"
                  description={`Livraison: ${delivery.title}`}
                />
              </Elements>
            </CardContent>
          </Card>
        )}

        {/* Informations de sécurité */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-800 mb-2">
              🔒 Paiement sécurisé
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • Votre paiement est retenu en sécurité jusqu'à la livraison
              </li>
              <li>• Le livreur sera payé seulement après validation du code</li>
              <li>• Remboursement automatique en cas de problème</li>
              <li>• Données protégées par Stripe (certifié PCI DSS)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
