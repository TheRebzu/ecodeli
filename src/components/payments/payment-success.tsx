"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PaymentSuccessProps {
  paymentIntentId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  type?: "delivery" | "booking" | "subscription";
  entityId?: string;
}

export function PaymentSuccess({
  paymentIntentId,
  amount,
  currency = "EUR",
  description,
  type,
  entityId,
}: PaymentSuccessProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const handleViewDetails = () => {
    setIsLoading(true);
    switch (type) {
      case "delivery":
        router.push(`/client/deliveries/${entityId}`);
        break;
      case "booking":
        router.push(`/client/services/bookings`);
        break;
      case "subscription":
        router.push("/client/subscription");
        break;
      default:
        router.push("/client");
    }
  };

  const handleDownloadReceipt = async () => {
    // TODO: Implémenter téléchargement du reçu
    console.log("Téléchargement du reçu:", paymentIntentId);
  };

  const getSuccessMessage = () => {
    switch (type) {
      case "delivery":
        return {
          title: "Paiement de livraison confirmé !",
          subtitle: "Votre livraison va être traitée",
          nextAction: "Suivre ma livraison",
        };
      case "booking":
        return {
          title: "Réservation confirmée !",
          subtitle: "Votre prestataire va être notifié",
          nextAction: "Voir mes réservations",
        };
      case "subscription":
        return {
          title: "Abonnement activé !",
          subtitle: "Profitez de tous les avantages",
          nextAction: "Découvrir mes avantages",
        };
      default:
        return {
          title: "Paiement confirmé !",
          subtitle: "Votre transaction a été traitée",
          nextAction: "Continuer",
        };
    }
  };

  const { title, subtitle, nextAction } = getSuccessMessage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-900">
            {title}
          </CardTitle>
          <p className="text-muted-foreground">{subtitle}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Détails du paiement */}
          <div className="space-y-3">
            {description && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{description}</span>
              </div>
            )}

            {amount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">
                  {formatAmount(amount, currency)}
                </span>
              </div>
            )}

            {paymentIntentId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Référence</span>
                <span className="font-mono text-xs">
                  {paymentIntentId.substring(0, 12)}...
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleViewDetails}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              {nextAction}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReceipt}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Reçu
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "Paiement confirmé - EcoDeli",
                      text: `Paiement de ${formatAmount(amount || 0, currency)} confirmé`,
                    });
                  }
                }}
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            Un email de confirmation vous a été envoyé
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
