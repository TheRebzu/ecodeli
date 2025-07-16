"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Euro,
  FileText,
  MessageSquare,
  CalendarDays,
  Phone,
  Mail,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface PaidApplication {
  id: string;
  providerId: string;
  clientId: string;
  serviceRequestId: string;
  title: string;
  description: string;
  scheduledDate: string;
  estimatedDuration: number;
  actualDuration?: number;
  status: string;
  notes?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  client: {
    id: string;
    email: string; // Ajouter l'email du client
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
      address?: string;
      city?: string;
    };
  };
  serviceRequest: {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    status: string;
    pickupAddress: string;
    deliveryAddress: string;
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  };
  applicationData: {
    proposedPrice: number;
    message: string;
    applicationId: string;
    paymentStatus: string;
    paidAt: string | null;
    availableDates: string[];
  };
}

interface ApplicationsResponse {
  interventions: PaidApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ProviderInterventionsPage() {
  const t = useTranslations("ProviderInterventions");
  const [applications, setApplications] = useState<PaidApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactInfo, setContactInfo] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/provider/interventions");

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des applications payées");
      }

      const data: ApplicationsResponse = await response.json();
      setApplications(data.interventions);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du chargement des applications payées");
    } finally {
      setLoading(false);
    }
  };

  const toggleContactInfo = (applicationId: string) => {
    setContactInfo(prev => ({
      ...prev,
      [applicationId]: !prev[applicationId]
    }));
  };

  const handleCompleteTask = async (applicationId: string) => {
    try {
      const response = await fetch(`/api/provider/interventions/${applicationId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success("Tâche terminée avec succès");
        // Recharger les données
        fetchApplications();
      } else {
        toast.error("Erreur lors de la finalisation de la tâche");
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la finalisation de la tâche");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" /> Payée
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0
      ? `${hours}h${mins > 0 ? ` ${mins}min` : ""}`
      : `${mins}min`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des applications payées...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Applications Payées
        </h1>
        <p className="text-gray-600">
          Consultez toutes vos candidatures acceptées et payées par les clients
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune application payée
              </h3>
              <p className="text-gray-600 mb-4">
                Vous n'avez pas encore d'applications payées par les clients.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{application.title}</CardTitle>
                      {getStatusBadge(application.status)}
                    </div>
                    <p className="text-gray-600 line-clamp-2">
                      {application.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(application.payment.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Payé le {formatDate(application.applicationData.paidAt || application.createdAt)}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informations client */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <h4 className="font-semibold">Client</h4>
                        <p className="text-gray-600">
                          {application.client.profile.firstName} {application.client.profile.lastName}
                        </p>
                        {application.client.profile.city && (
                          <p className="text-sm text-gray-500">
                            {application.client.profile.city}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Adresses */}
                    {(application.serviceRequest.pickupAddress || application.serviceRequest.deliveryAddress) && (
                      <div className="space-y-2">
                        {application.serviceRequest.pickupAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Adresse de départ</p>
                              <p className="text-sm text-gray-600">
                                {application.serviceRequest.pickupAddress}
                              </p>
                            </div>
                          </div>
                        )}
                        {application.serviceRequest.deliveryAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Adresse de destination</p>
                              <p className="text-sm text-gray-600">
                                {application.serviceRequest.deliveryAddress}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Informations service */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <h4 className="font-semibold">Durée estimée</h4>
                        <p className="text-gray-600">
                          {formatDuration(application.estimatedDuration)}
                        </p>
                      </div>
                    </div>

                    {application.applicationData.availableDates.length > 0 && (
                      <div className="flex items-start gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Dates disponibles</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {application.applicationData.availableDates.slice(0, 3).map((date, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {new Date(date).toLocaleDateString("fr-FR")}
                              </Badge>
                            ))}
                            {application.applicationData.availableDates.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{application.applicationData.availableDates.length - 3} autres
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {application.applicationData.message && (
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Message du client</p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {application.applicationData.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Candidature soumise le {formatDate(application.createdAt)}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleContactInfo(application.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contacter
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleCompleteTask(application.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Finir la tâche
                    </Button>
                  </div>
                </div>

                {/* Informations de contact */}
                {contactInfo[application.id] && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-3">Coordonnées du client</h4>
                    <div className="space-y-2">
                      {application.client.profile.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{application.client.profile.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{application.client.email}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
