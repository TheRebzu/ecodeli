"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  MapPin,
  Clock,
  Euro,
  AlertCircle,
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  MessageCircle,
  Phone,
  Navigation,
} from "lucide-react";
import { Announcement } from "@/features/announcements/types/announcement.types";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

export default function DelivererAnnouncementDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("deliverer.announcements");
  const { toast } = useToast();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [interestMessage, setInterestMessage] = useState("");
  const [submittingInterest, setSubmittingInterest] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchAnnouncement();
    }
  }, [id, user]);

  const fetchAnnouncement = async () => {
    try {
      const response = await fetch(`/api/deliverer/announcements/${id}`);
      if (!response.ok) {
        throw new Error("Annonce non trouvée");
      }
      const data = await response.json();
      setAnnouncement(data);
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger l'annonce",
        variant: "destructive",
      });
      router.push("/deliverer/announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleInterest = async () => {
    if (!announcement) return;

    setSubmittingInterest(true);
    try {
      const response = await fetch(
        `/api/deliverer/announcements/${id}/interest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: interestMessage || "Je suis intéressé par cette livraison",
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de l'expression d'intérêt");
      }

      toast({
        title: "✅ Succès",
        description: "Votre intérêt a été transmis au client",
      });

      setShowInterestDialog(false);
      setInterestMessage("");
      // Rafraîchir les données
      fetchAnnouncement();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible d'exprimer votre intérêt",
        variant: "destructive",
      });
    } finally {
      setSubmittingInterest(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      PACKAGE_DELIVERY: "Transport de colis",
      PERSON_TRANSPORT: "Transport de personnes",
      AIRPORT_TRANSFER: "Transfert aéroport",
      SHOPPING: "Courses",
      INTERNATIONAL_PURCHASE: "Achats internationaux",
      HOME_SERVICE: "Services à domicile",
      PET_SITTING: "Garde d'animaux",
      CART_DROP: "Lâcher de chariot",
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "MATCHED":
        return <Users className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "MATCHED":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateDistance = () => {
    // Simulation du calcul de distance - dans un vrai projet, utiliser une API de géolocalisation
    return Math.floor(Math.random() * 50) + 1;
  };

  const getMatchScore = () => {
    // Simulation du score de matching - dans un vrai projet, utiliser l'algorithme de matching
    return Math.floor(Math.random() * 40) + 60;
  };

  const estimateEarnings = (basePrice: number) => {
    // Commission EcoDeli (simulation)
    const commission = 0.15; // 15%
    return basePrice * (1 - commission);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Annonce non trouvée</p>
        </div>
      </div>
    );
  }

  const distance = calculateDistance();
  const matchScore = getMatchScore();
  const estimatedEarnings = estimateEarnings(announcement.price);

  return (
    <div className="space-y-6">
      <PageHeader
        title={announcement.title}
        description={`Publiée ${formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true, locale: fr })}`}
        action={
          <Link href="/deliverer/announcements">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux annonces
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Détails de la mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Type de service</p>
                  <p className="font-medium">
                    {getTypeLabel(announcement.type)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statut</p>
                  <Badge className={getStatusColor(announcement.status)}>
                    {getStatusIcon(announcement.status)}
                    <span className="ml-1">{announcement.status}</span>
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="mt-1">{announcement.description}</p>
              </div>

              {announcement.specialInstructions && (
                <div>
                  <p className="text-sm text-gray-600">
                    Instructions spéciales
                  </p>
                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm">
                      {announcement.specialInstructions}
                    </p>
                  </div>
                </div>
              )}

              {announcement.urgent && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-red-800">
                    🚨 Mission urgente
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Intervention requise dans les plus brefs délais
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Itinéraire détaillé */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Itinéraire ({distance} km)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-px h-8 bg-gray-300"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">📍 Point de départ</p>
                    <p className="font-medium">
                      {announcement.startLocation.address}
                    </p>
                    <p className="text-sm text-gray-500">
                      {announcement.startLocation.city},{" "}
                      {announcement.startLocation.postalCode}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">🎯 Destination</p>
                    <p className="font-medium">
                      {announcement.endLocation.address}
                    </p>
                    <p className="text-sm text-gray-500">
                      {announcement.endLocation.city},{" "}
                      {announcement.endLocation.postalCode}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Distance estimée
                  </span>
                  <span className="text-sm font-bold text-blue-800">
                    {distance} km
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Durée approximative : {Math.ceil(distance * 1.5)} minutes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Détails du colis */}
          {announcement.packageDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Informations du colis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Poids</p>
                    <p className="font-medium">
                      {announcement.packageDetails.weight} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dimensions</p>
                    <p className="font-medium">
                      {announcement.packageDetails.length} x{" "}
                      {announcement.packageDetails.width} x{" "}
                      {announcement.packageDetails.height} cm
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Contenu</p>
                  <p className="font-medium">
                    {announcement.packageDetails.content}
                  </p>
                </div>

                {announcement.packageDetails.fragile && (
                  <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-yellow-800">
                      ⚠️ Colis fragile
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Manipulation délicate requise - Transport avec précautions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Informations client */}
          {announcement.client && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {announcement.client.profile?.firstName || "Client"}{" "}
                      {announcement.client.profile?.lastName || ""}
                    </p>
                    <p className="text-sm text-gray-500">
                      Membre depuis{" "}
                      {format(
                        new Date(
                          announcement.client.createdAt ||
                            announcement.createdAt,
                        ),
                        "MMMM yyyy",
                        { locale: fr },
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total d'annonces</p>
                    <p className="font-medium">-</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Note moyenne</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">4.8</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne secondaire */}
        <div className="space-y-6">
          {/* Score de compatibilité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Compatibilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {matchScore}%
                </div>
                <p className="text-sm text-gray-600">Score de correspondance</p>
              </div>

              <div className="w-full bg-green-200 rounded-full h-3 mb-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${matchScore}%` }}
                ></div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Itinéraire</span>
                  <span className="font-medium">Excellent</span>
                </div>
                <div className="flex justify-between">
                  <span>Horaires</span>
                  <span className="font-medium">Bon</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacité</span>
                  <span className="font-medium">Parfait</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rémunération */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Rémunération
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Prix client</p>
                <p className="text-xl font-bold text-gray-900">
                  {announcement.price.toFixed(2)} €
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-gray-600">Vos gains estimés</p>
                <p className="text-2xl font-bold text-green-600">
                  {estimatedEarnings.toFixed(2)} €
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Commission EcoDeli déduite (15%)
                </p>
              </div>

              <div className="bg-green-50 p-3 rounded-md">
                <p className="text-sm font-medium text-green-800">
                  💰 Gains par kilomètre
                </p>
                <p className="text-lg font-bold text-green-800">
                  {(estimatedEarnings / distance).toFixed(2)} €/km
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Planification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Planification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Date souhaitée</p>
                <p className="font-medium">
                  {format(
                    new Date(announcement.desiredDate),
                    "EEEE dd MMMM yyyy",
                    { locale: fr },
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {format(new Date(announcement.desiredDate), "HH:mm")}
                </p>
              </div>

              {announcement.flexibleDates && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-blue-800">
                    📅 Dates flexibles
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Le client accepte d'ajuster les dates
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Temps estimé</p>
                <p className="font-medium">
                  {Math.ceil(distance * 1.5)} minutes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Dialog
                  open={showInterestDialog}
                  onOpenChange={setShowInterestDialog}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Exprimer mon intérêt
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Exprimer votre intérêt</DialogTitle>
                      <DialogDescription>
                        Envoyez un message au client pour lui faire savoir que
                        vous êtes intéressé par cette livraison.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <Textarea
                        placeholder="Bonjour, je suis disponible pour effectuer cette livraison. Je peux m'adapter à vos horaires..."
                        value={interestMessage}
                        onChange={(e) => setInterestMessage(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowInterestDialog(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleInterest}
                        disabled={submittingInterest}
                      >
                        {submittingInterest ? "Envoi..." : "Envoyer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="w-full">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contacter le client
                </Button>

                <Button variant="outline" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir sur la carte
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Vues</span>
                <span className="font-medium">{announcement.viewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Intéressés</span>
                <span className="font-medium">
                  {announcement.interestedDeliverers?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Créée</span>
                <span className="font-medium">
                  {format(new Date(announcement.createdAt), "dd/MM/yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
