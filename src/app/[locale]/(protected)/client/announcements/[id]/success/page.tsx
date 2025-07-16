"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentResult {
  success: boolean;
  message: string;
  paymentId?: string;
  announcementId?: string;
}

export default function PaymentSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [result, setResult] = useState<PaymentResult | null>(null);

  const announcementId = params.id as string;
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setResult({
          success: false,
          message: "Session de paiement non trouvée"
        });
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/client/announcements/${announcementId}/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setResult({
            success: true,
            message: "Paiement confirmé avec succès",
            paymentId: data.paymentId,
            announcementId: data.announcementId,
          });
        } else {
          setResult({
            success: false,
            message: data.error || "Erreur lors de la vérification du paiement"
          });
        }
      } catch (error) {
        console.error("Erreur de vérification:", error);
        setResult({
          success: false,
          message: "Erreur de connexion lors de la vérification"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, announcementId]);

  const handleContinue = () => {
    if (result?.success) {
      router.push(`/client/announcements/${announcementId}?payment_success=true`);
    } else {
      router.push("/client/announcements");
    }
  };

  if (verifying) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500" />
            <CardTitle>Vérification du paiement</CardTitle>
            <CardDescription>
              Veuillez patienter pendant que nous vérifions votre paiement...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          {result?.success ? (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <CardTitle className="text-green-700">Paiement réussi !</CardTitle>
              <CardDescription>
                Votre paiement a été traité avec succès
              </CardDescription>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <CardTitle className="text-red-700">Erreur de paiement</CardTitle>
              <CardDescription>
                {result?.message || "Une erreur est survenue"}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {result?.success && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Prochaines étapes :</h3>
              <ul className="mt-2 text-sm text-green-700 list-disc list-inside">
                <li>Votre annonce est maintenant active</li>
                <li>Vous recevrez des notifications lorsqu'un livreur sera intéressé</li>
                <li>Vous pouvez suivre l'état de votre annonce dans votre tableau de bord</li>
              </ul>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={handleContinue} className="flex-1">
              {result?.success ? "Voir l'annonce" : "Retour aux annonces"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 