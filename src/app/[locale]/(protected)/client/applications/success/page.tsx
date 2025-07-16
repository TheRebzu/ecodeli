"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, User, Calendar, MapPin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface SuccessData {
  sessionId: string;
  applicationId?: string;
  amount?: number;
  providerName?: string;
  serviceTitle?: string;
  status: "success" | "error" | "loading";
}

export default function ApplicationSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get("session_id");
  const applicationId = searchParams.get("application_id");

  useEffect(() => {
    const verifySuccess = async () => {
      if (!sessionId) {
        setSuccessData({
          sessionId: "",
          status: "error",
        });
        setLoading(false);
        return;
      }

      try {
        // Vérifier le succès avec l'API
        const response = await fetch("/api/client/applications/verify-success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            applicationId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuccessData({
            sessionId,
            applicationId: data.applicationId,
            amount: data.amount,
            providerName: data.providerName,
            serviceTitle: data.serviceTitle,
            status: "success",
          });

          toast.success("Candidature soumise avec succès !");
        } else {
          setSuccessData({
            sessionId,
            applicationId,
            status: "error",
          });
          toast.error("Erreur lors de la vérification");
        }
      } catch (error) {
        console.error("Error verifying success:", error);
        setSuccessData({
          sessionId,
          applicationId,
          status: "error",
        });
        toast.error("Erreur lors de la vérification");
      } finally {
        setLoading(false);
      }
    };

    verifySuccess();
  }, [sessionId, applicationId]);

  const handleGoToApplications = () => {
    router.push("/fr/client/applications");
  };

  const handleGoToDashboard = () => {
    router.push("/fr/client");
  };

  const handleContactSupport = () => {
    router.push("/fr/client/support");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">
                Vérification en cours...
              </h2>
              <p className="text-gray-600">
                Veuillez patienter pendant que nous vérifions votre candidature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!successData || successData.status === "error") {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-red-600 text-4xl mb-4">❌</div>
              <h2 className="text-xl font-semibold mb-2">Erreur de traitement</h2>
              <p className="text-gray-600 mb-6">
                Une erreur s'est produite lors du traitement de votre candidature.
              </p>
              <div className="space-y-3">
                <Button onClick={handleGoToApplications} className="w-full">
                  Retour aux candidatures
                </Button>
                <Button
                  variant="outline"
                  onClick={handleContactSupport}
                  className="w-full"
                >
                  Contacter le support
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGoToDashboard}
                  className="w-full"
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span className="text-2xl">Candidature soumise !</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-600">
                  Candidature confirmée
                </span>
              </div>
              {successData.amount && (
                <p className="text-sm text-green-700">
                  <strong>Montant:</strong> {successData.amount.toFixed(2)}€
                </p>
              )}
              <p className="text-sm text-green-700">
                <strong>Statut:</strong> En attente de validation
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Prochaines étapes</h3>
              <ul className="text-sm text-gray-600 space-y-2 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Votre candidature a été reçue et enregistrée
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Vous recevrez une confirmation par email
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Notre équipe va examiner votre dossier
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Vous serez notifié du statut dans les 48h
                </li>
              </ul>
            </div>

            {successData.providerName && successData.serviceTitle && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Détails du service</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Service:</strong> {successData.serviceTitle}</p>
                  <p><strong>Prestataire:</strong> {successData.providerName}</p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Besoin d'aide ?</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>support@ecodeli.fr</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>01 23 45 67 89</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button onClick={handleGoToApplications} className="w-full">
                Voir mes candidatures
              </Button>
              <Button
                variant="outline"
                onClick={handleGoToDashboard}
                className="w-full"
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 