"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Calendar,
  Star,
  MapPin,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

interface Application {
  id: string;
  serviceRequestId: string;
  providerId: string;
  proposedPrice: number;
  estimatedDuration: number;
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  availableDates: string[];
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    businessName: string;
    hourlyRate: number;
    averageRating: number;
    totalBookings: number;
    user: {
      id: string;
      profile: {
        firstName: string;
        lastName: string;
        avatar?: string;
        city?: string;
      };
    };
  };
  serviceRequest: {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    status: string;
    createdAt: string;
  };
}

interface ApplicationsResponse {
  applications: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ClientApplicationsPage() {
  const t = useTranslations("ClientApplications");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [responseDialog, setResponseDialog] = useState(false);
  const [responseAction, setResponseAction] = useState<
    "ACCEPT" | "REJECT" | null
  >(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [responding, setResponding] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/applications");

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des candidatures");
      }

      const data: ApplicationsResponse = await response.json();
      setApplications(data.applications);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des candidatures");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedApplication || !responseAction) return;

    try {
      setResponding(true);
      const response = await fetch(
        `/api/client/applications/${selectedApplication.id}/respond`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: responseAction,
            message: responseMessage,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la réponse");
      }

      toast.success(
        responseAction === "ACCEPT"
          ? "Candidature acceptée avec succès"
          : "Candidature refusée",
      );

      // Mettre à jour la liste
      await fetchApplications();

      // Fermer le dialogue
      setResponseDialog(false);
      setSelectedApplication(null);
      setResponseAction(null);
      setResponseMessage("");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la réponse");
    } finally {
      setResponding(false);
    }
  };

  const handlePayService = async (application: Application) => {
    try {
      setPaying(true);
      const response = await fetch(
        `/api/client/applications/${application.id}/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentMethod: "CARD",
            amount: application.proposedPrice,
            currency: "EUR",
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du paiement");
      }

      const data = await response.json();

      // Rediriger vers Stripe pour finaliser le paiement
      if (data.stripe && data.stripe.paymentIntentId) {
        // Créer une session Stripe Checkout
        const checkoutResponse = await fetch(
          "/api/client/applications/create-checkout-session",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              applicationId: application.id,
              amount: application.proposedPrice,
              currency: "EUR",
              description: `Paiement service - ${application.serviceRequest.title}`,
              paymentIntentId: data.stripe.paymentIntentId,
            }),
          },
        );

        if (checkoutResponse.ok) {
          const checkoutData = await checkoutResponse.json();
          if (checkoutData.checkoutUrl) {
            // Rediriger vers Stripe Checkout
            window.location.href = checkoutData.checkoutUrl;
            return;
          }
        }
      }

      // Fallback si pas de redirection Stripe
      toast.success(
        "Paiement effectué avec succès ! Le prestataire a été notifié.",
      );

      // Mettre à jour la liste
      await fetchApplications();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du paiement");
    } finally {
      setPaying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" /> En attente
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" /> Acceptée
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" /> Refusée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des candidatures...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Candidatures reçues</h1>
        <p className="text-muted-foreground">
          Gérez les candidatures reçues pour vos demandes de services
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune candidature</h3>
              <p className="text-muted-foreground">
                Vous n'avez pas encore reçu de candidatures pour vos demandes de
                services.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map((application) => (
            <Card key={application.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage
                        src={application.provider.user.profile.avatar}
                      />
                      <AvatarFallback>
                        {application.provider.user.profile.firstName?.[0]}
                        {application.provider.user.profile.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold">
                          {application.provider.businessName ||
                            `${application.provider.user.profile.firstName} ${application.provider.user.profile.lastName}`}
                        </h3>
                        {application.provider.averageRating > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm">
                              {application.provider.averageRating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {application.provider.user.profile.city && (
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {application.provider.user.profile.city}
                          </div>
                        )}
                        <span>
                          {application.provider.totalBookings} interventions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(application.status)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Demande de service</h4>
                  <p className="text-sm text-muted-foreground">
                    {application.serviceRequest.title}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Prix proposé
                    </p>
                    <p className="text-lg font-semibold">
                      {formatPrice(application.proposedPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Durée estimée
                    </p>
                    <p className="text-lg font-semibold">
                      {application.estimatedDuration} min
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Date de candidature
                    </p>
                    <p className="text-sm">
                      {formatDate(application.createdAt)}
                    </p>
                  </div>
                </div>

                {application.message && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Message du prestataire
                      </p>
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {application.message}
                      </p>
                    </div>
                  </>
                )}

                {application.status === "PENDING" && (
                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={() => {
                        setSelectedApplication(application);
                        setResponseAction("ACCEPT");
                        setResponseDialog(true);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accepter
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedApplication(application);
                        setResponseAction("REJECT");
                        setResponseDialog(true);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                  </div>
                )}

                {application.status === "ACCEPTED" && (
                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={() => handlePayService(application)}
                      disabled={paying}
                      className="flex-1"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {paying ? "Paiement..." : "Payer le service"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogue de réponse */}
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseAction === "ACCEPT"
                ? "Accepter la candidature"
                : "Refuser la candidature"}
            </DialogTitle>
            <DialogDescription>
              {responseAction === "ACCEPT"
                ? "Vous êtes sur le point d'accepter cette candidature. Le prestataire sera notifié."
                : "Vous êtes sur le point de refuser cette candidature. Le prestataire sera notifié."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Message (optionnel)</label>
              <Textarea
                placeholder={
                  responseAction === "ACCEPT"
                    ? "Message de confirmation..."
                    : "Raison du refus..."
                }
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResponseDialog(false)}
              disabled={responding}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRespond}
              disabled={responding}
              variant={responseAction === "ACCEPT" ? "default" : "destructive"}
            >
              {responding
                ? "Traitement..."
                : responseAction === "ACCEPT"
                  ? "Accepter"
                  : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
