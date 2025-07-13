"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useProviderServiceRequests } from "@/features/provider/hooks/useProviderServiceRequests";
import { ServiceRequest } from "@/features/services/types/service.types";
import {
  Search,
  MapPin,
  Clock,
  Euro,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const serviceTypes = [
  { value: "HOME_SERVICE", label: "Services à domicile", icon: "🏠" },
  { value: "PET_SITTING", label: "Garde d'animaux", icon: "🐕" },
  { value: "PERSON_TRANSPORT", label: "Transport de personnes", icon: "🚗" },
  { value: "AIRPORT_TRANSFER", label: "Transfert aéroport", icon: "✈️" },
  { value: "CLEANING", label: "Ménage", icon: "🧹" },
  { value: "GARDENING", label: "Jardinage", icon: "🌱" },
  { value: "HANDYMAN", label: "Bricolage", icon: "🔧" },
  { value: "TUTORING", label: "Cours particuliers", icon: "📚" },
  { value: "HEALTHCARE", label: "Soins", icon: "🏥" },
  { value: "BEAUTY", label: "Beauté", icon: "💄" },
];

const urgencyLevels = [
  { value: "LOW", label: "Faible", color: "bg-green-100 text-green-800" },
  { value: "NORMAL", label: "Normale", color: "bg-blue-100 text-blue-800" },
  { value: "HIGH", label: "Élevée", color: "bg-orange-100 text-orange-800" },
  { value: "URGENT", label: "Urgente", color: "bg-red-100 text-red-800" },
];

export function ServiceRequestsBrowser() {
  const t = useTranslations("provider.serviceRequests");
  const { toast } = useToast();
  const { serviceRequests, isLoading, error, applyToServiceRequest } =
    useProviderServiceRequests();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  const [selectedServiceRequest, setSelectedServiceRequest] =
    useState<ServiceRequest | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    price: 0,
    estimatedDuration: 60,
    message: "",
    availableDates: [] as string[],
  });

  const filteredRequests = serviceRequests.filter((request) => {
    if (
      searchTerm &&
      !request.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !request.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (selectedType !== "all" && request.serviceType !== selectedType) {
      return false;
    }
    if (selectedUrgency !== "all" && request.urgency !== selectedUrgency) {
      return false;
    }
    return true;
  });

  const handleApply = async () => {
    if (!selectedServiceRequest) return;

    // Validation côté client
    if (
      !applicationForm.message.trim() ||
      applicationForm.message.length < 10
    ) {
      toast({
        title: "Message invalide",
        description: "Le message doit faire au moins 10 caractères",
        variant: "destructive",
      });
      return;
    }

    const success = await applyToServiceRequest(
      selectedServiceRequest.id,
      applicationForm,
    );

    if (success) {
      toast({
        title: "Candidature envoyée",
        description: "Votre candidature a été envoyée avec succès",
        variant: "default",
      });
      setShowApplyDialog(false);
      setSelectedServiceRequest(null);
      setApplicationForm({
        price: 0,
        estimatedDuration: 60,
        message: "",
        availableDates: [],
      });
    } else {
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de l'envoi de votre candidature",
        variant: "destructive",
      });
    }
  };

  const getServiceTypeInfo = (type: string) => {
    return serviceTypes.find((t) => t.value === type) || serviceTypes[0];
  };

  const getUrgencyInfo = (urgency: string) => {
    return urgencyLevels.find((u) => u.value === urgency) || urgencyLevels[1];
  };

  const ServiceRequestCard = ({
    serviceRequest,
  }: {
    serviceRequest: ServiceRequest;
  }) => {
    const typeInfo = getServiceTypeInfo(serviceRequest.serviceType);
    const urgencyInfo = getUrgencyInfo(serviceRequest.urgency);

    // Debug: Afficher les données du client
    console.log("🔍 ServiceRequestCard - Données client:", {
      id: serviceRequest.id,
      title: serviceRequest.title,
      client: serviceRequest.client,
      clientProfile: serviceRequest.client?.profile,
    });

    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{typeInfo.icon}</span>
              <div>
                <CardTitle className="text-lg">
                  {serviceRequest.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>
                    {serviceRequest.client?.profile?.firstName || "Client"}{" "}
                    {serviceRequest.client?.profile?.lastName || "Anonyme"}
                  </span>
                </div>
              </div>
            </div>
            <Badge className={urgencyInfo.color}>{urgencyInfo.label}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-700 line-clamp-3">
            {serviceRequest.description}
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-green-600" />
              <span>
                <strong>{serviceRequest.budget}€</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{serviceRequest.estimatedDuration} min</span>
            </div>
            {serviceRequest.location && (
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">
                  {serviceRequest.location.city}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 col-span-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-gray-600">
                {new Date(serviceRequest.scheduledAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {serviceRequest.isRecurring && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <CheckCircle className="w-4 h-4" />
              <span>Service récurrent - {serviceRequest.frequency}</span>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setSelectedServiceRequest(serviceRequest);
                setApplicationForm({
                  price: serviceRequest.budget,
                  estimatedDuration: serviceRequest.estimatedDuration,
                  message: "",
                  availableDates: [],
                });
                setShowApplyDialog(true);
              }}
            >
              Candidater
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedServiceRequest(serviceRequest);
                // Ouvrir dialog de détails
              }}
            >
              Détails
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erreur</h3>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher des demandes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUrgency} onValueChange={setSelectedUrgency}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Toutes urgences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes urgences</SelectItem>
                {urgencyLevels.map((urgency) => (
                  <SelectItem key={urgency.value} value={urgency.value}>
                    {urgency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Aucune demande trouvée
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedType !== "all" || selectedUrgency !== "all"
                ? "Aucune demande ne correspond à vos critères"
                : "Aucune demande de service disponible pour le moment"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((serviceRequest) => (
            <ServiceRequestCard
              key={serviceRequest.id}
              serviceRequest={serviceRequest}
            />
          ))}
        </div>
      )}

      {/* Dialog de candidature */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Candidater à cette demande</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Prix proposé (€)</Label>
              <Input
                id="price"
                type="number"
                value={applicationForm.price}
                onChange={(e) =>
                  setApplicationForm({
                    ...applicationForm,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="duration">Durée estimée (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={applicationForm.estimatedDuration}
                onChange={(e) =>
                  setApplicationForm({
                    ...applicationForm,
                    estimatedDuration: parseInt(e.target.value) || 60,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="message">Message au client</Label>
              <Textarea
                id="message"
                placeholder="Présentez-vous et expliquez pourquoi vous êtes le bon prestataire pour ce service..."
                value={applicationForm.message}
                onChange={(e) =>
                  setApplicationForm({
                    ...applicationForm,
                    message: e.target.value,
                  })
                }
                rows={4}
                className={
                  applicationForm.message.length > 0 &&
                  applicationForm.message.length < 10
                    ? "border-red-500"
                    : ""
                }
              />
              {applicationForm.message.length > 0 &&
                applicationForm.message.length < 10 && (
                  <p className="mt-1 text-sm text-red-600">
                    Le message doit faire au moins 10 caractères
                  </p>
                )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowApplyDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1"
                disabled={
                  !applicationForm.message.trim() ||
                  applicationForm.message.length < 10
                }
              >
                Envoyer candidature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
