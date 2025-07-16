"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  MapPin,
  Clock,
  Euro,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Route,
  Star,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  MessageCircle,
  Phone,
} from "lucide-react";
import { Announcement } from "@/features/announcements/types/announcement.types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

// Fonction utilitaire pour formater les dates de manière sécurisée
const safeFormatDate = (
  dateValue: any,
  formatString: string,
  fallback: string = "Date non disponible",
) => {
  try {
    if (!dateValue) return fallback;
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatString, { locale: fr });
  } catch (error) {
    console.warn("Erreur de formatage de date:", dateValue, error);
    return fallback;
  }
};

interface AnnouncementDetails {
  id: string;
  title: string;
  description: string;
  type: string;
  deliveryType?: string;
  status: string;

  // Prix (format API)
  price?: number;
  currency: string;

  // Options (format API)
  urgent?: boolean;
  flexibleDates?: boolean;
  specialInstructions?: string;

  // Dates
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  desiredDate?: string;
  viewCount?: number;

  // Adresses (format API)
  startLocation?: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  endLocation?: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
    lat?: number;
    lng?: number;
  };

  // Auteur principal (format API)
  author?: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };

  // Client/Merchant info (format API)
  client?: {
    id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  merchant?: {
    id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      businessName?: string;
      avatar?: string;
    };
  };

  // Détails du colis (format API)
  packageDetails?: {
    weight: number;
    length: number;
    width: number;
    height: number;
    fragile: boolean;
    content: string;
    requiresInsurance: boolean;
    insuredValue?: number;
  };

  // Détails du service (format API)
  serviceDetails?: {
    serviceType: string;
    numberOfPeople?: number;
    duration?: number;
    recurringService?: boolean;
    recurringPattern?: string;
    specialRequirements?: string;
  };

  // Correspondances de trajets (format API)
  routeMatches?: Array<{
    id: string;
    routeId: string;
    announcementId: string;
    matchScore: number;
    isNotified: boolean;
    notifiedAt?: string;
    createdAt: string;
    route?: {
      id: string;
      delivererId: string;
      startLocation: {
        address: string;
        lat?: number;
        lng?: number;
      };
      endLocation: {
        address: string;
        lat?: number;
        lng?: number;
      };
      departureTime: string;
      deliverer?: {
        id: string;
        profile?: {
          firstName?: string;
          lastName?: string;
          avatar?: string;
        };
      };
    };
  }>;

  // Livraison (format API)
  delivery?: {
    id: string;
    status: string;
    trackingNumber?: string;
    deliverer?: {
      id: string;
      profile?: {
        firstName?: string;
        lastName?: string;
        avatar?: string;
        phone?: string;
      };
    };
  };

  // Évaluations et pièces jointes
  reviews?: Array<any>;
  attachments?: Array<any>;
  payment?: {
    id: string;
    status: string;
    paymentDate?: string;
  };
  payments?: Array<{
    id: string;
    status: string;
    paymentDate?: string;
  }>;
}

const statusLabels = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-800" },
  ACTIVE: { label: "Publiée", color: "bg-green-100 text-green-800" },
  MATCHED: { label: "Matchée", color: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "En cours", color: "bg-orange-100 text-orange-800" },
  COMPLETED: { label: "Terminée", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-800" },
  // Delivery status values:
  ACCEPTED: { label: "Acceptée", color: "bg-blue-100 text-blue-800" },
  PICKED_UP: { label: "Colis récupéré", color: "bg-yellow-100 text-yellow-800" },
  IN_TRANSIT: { label: "En cours de livraison", color: "bg-orange-100 text-orange-800" },
  DELIVERED: { label: "Livrée", color: "bg-green-100 text-green-800" },
};

const typeLabels = {
  PACKAGE_DELIVERY: { label: "Livraison de colis", icon: Package },
  PERSON_TRANSPORT: { label: "Transport de personnes", icon: Users },
  AIRPORT_TRANSFER: { label: "Transfert aéroport", icon: Users },
  SHOPPING: { label: "Courses", icon: Package },
  INTERNATIONAL_PURCHASE: { label: "Achat international", icon: Package },
  PET_SITTING: { label: "Garde d'animaux", icon: Package },
  HOME_SERVICE: { label: "Service à domicile", icon: Package },
  CART_DROP: { label: "Lâcher de chariot", icon: Package },
};

const deliveryTypeLabels = {
  FULL: "Prise en charge intégrale",
  PARTIAL: "Prise en charge partielle",
  FINAL: "Livraison finale",
};

export default function AnnouncementDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("client.announcements");
  const { toast } = useToast();
  const [announcement, setAnnouncement] = useState<AnnouncementDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/announcements/${id}`, {
        headers: {
          "Content-Type": "application/json",
        },
        cache: 'no-store', // Force refresh
      });
      if (!response.ok) {
        throw new Error("Erreur lors du chargement de l'annonce");
      }
      const data = await response.json();
      setAnnouncement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  // Rafraîchir automatiquement si on détecte un retour de paiement
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
      // Attendre un peu puis rafraîchir pour laisser le temps au webhook
      setTimeout(() => {
        fetchAnnouncement();
      }, 2000);
    }
  }, []);

  const handleDelete = async () => {
    if (
      !announcement ||
      !window.confirm("Êtes-vous sûr de vouloir supprimer cette annonce ?")
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        router.push("/client/announcements");
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || "Impossible de supprimer"}`);
      }
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      alert("Erreur de connexion");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/client/announcements/${id}/matches/${matchId}/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        // Recharger les données
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Erreur: ${error.error || "Impossible d'accepter"}`);
      }
    } catch (err) {
      console.error("❌ Erreur acceptation:", err);
      alert("Erreur de connexion");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusInfo = statusLabels[status as keyof typeof statusLabels];
    return statusInfo ? statusInfo.color : "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    const statusInfo = statusLabels[status as keyof typeof statusLabels];
    if (statusInfo) {
      if (status === "ACTIVE") return <CheckCircle className="h-4 w-4" />;
      if (status === "IN_PROGRESS") return <Clock className="h-4 w-4" />;
      if (status === "COMPLETED") return <CheckCircle className="h-4 w-4" />;
      if (status === "CANCELLED") return <XCircle className="h-4 w-4" />;
      if (status === "MATCHED") return <Users className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const typeInfo = typeLabels[type as keyof typeof typeLabels];
    return typeInfo ? typeInfo.label : type;
  };

  // Add this function to handle Stripe Checkout redirection
  const handleStripePay = async () => {
    setIsPaying(true);
    try {
      // Calculer le montant à partir de l'annonce
      const paymentAmount = announcement?.finalPrice || announcement?.basePrice || 0;
      
      const res = await fetch(`/api/client/announcements/${id}/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: "eur"
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error("Checkout session error:", data);
        alert(data.error || "Erreur lors de la création de la session de paiement.");
        return;
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("URL de paiement non reçue.");
      }
    } catch (err) {
      console.error("Stripe payment error:", err);
      alert("Erreur lors de la redirection vers Stripe.");
    } finally {
      setIsPaying(false);
    }
  };

  // Vérifier si le paiement a été effectué
  const isPaymentCompleted = announcement?.payment?.status === "COMPLETED";

  if (loading) {
    return <div>Chargement…</div>;
  }

  if (!announcement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">Annonce introuvable</h2>
          <p className="text-gray-600 mb-4">Cette annonce n'existe pas ou a été supprimée.</p>
          <Link href="/client/announcements">
            <Button>Retour à la liste</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Use delivery.status if available, otherwise fallback to announcement.status
  const unifiedStatus = announcement.delivery?.status || announcement.status;
  const statusInfo = statusLabels[unifiedStatus as keyof typeof statusLabels];
  const typeInfo = typeLabels[announcement.type as keyof typeof typeLabels];
  const TypeIcon = typeInfo?.icon || Package;

  // Actions disponibles selon le statut
  const canEdit = unifiedStatus === "DRAFT";
  const canDelete = ["DRAFT", "ACTIVE"].includes(unifiedStatus);
  const canViewCandidates =
    unifiedStatus === "ACTIVE" &&
    announcement.routeMatches &&
    announcement.routeMatches.length > 0;
  const hasDelivery = ["MATCHED", "IN_PROGRESS", "COMPLETED"].includes(
    unifiedStatus,
  );

  return (
    <>
      {/* Payment alert and button at the very top of the page */}
      {!isPaymentCompleted && (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <div className="mb-4 flex items-center bg-yellow-100 border border-yellow-400 rounded-lg p-4 shadow-sm">
            <AlertCircle className="h-7 w-7 mr-3 text-yellow-600 flex-shrink-0" />
            <span className="font-bold text-lg text-yellow-900">Le paiement doit être effectué pour lancer la livraison.</span>
          </div>
          <Button onClick={handleStripePay} disabled={isPaying} size="lg" className="w-full max-w-xs mx-auto block">
            {isPaying ? "Redirection..." : "Payer avec Stripe"}
          </Button>
        </div>
      )}
      <PageHeader
        title={announcement.title}
        description={`Annonce créée le ${safeFormatDate(announcement.createdAt, "dd MMMM yyyy")}`}
        action={
          <Link href="/client/announcements">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux annonces
            </Button>
          </Link>
        }
      />
      {/* Bouton de suivi de la livraison */}
      {announcement.delivery?.id && (
        <div className="mb-4 flex justify-end gap-2">
          <Link href={`/client/announcements/${announcement.id}/tracking`}>
            <Button variant="default">
              Suivi de la livraison
            </Button>
          </Link>
          <Link href={`/client/announcements/${announcement.id}/validation-code`}>
            <Button variant="secondary">
              Code de validation
            </Button>
          </Link>
        </div>
      )}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TypeIcon className="h-5 w-5" />
                    Détails de l'annonce
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {announcement.payment?.status === "COMPLETED" ? (
                      <Badge className="bg-green-600 text-white">Payé</Badge>
                    ) : announcement.payment?.status === "PENDING" ? (
                      <Badge className="bg-yellow-400 text-gray-900">En attente de paiement</Badge>
                    ) : (
                      <Badge className={statusInfo?.color || "bg-gray-100 text-gray-800"}>
                        {statusInfo?.label || unifiedStatus}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {getTypeLabel(announcement.type)}
                    </Badge>
                    {announcement.urgent && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-600">{announcement.description}</p>
                </div>

                {announcement.specialInstructions && (
                  <div>
                    <h4 className="font-medium mb-2">Instructions spéciales</h4>
                    <p className="text-gray-600">
                      {announcement.specialInstructions}
                    </p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Date souhaitée</p>
                      <p className="text-sm text-gray-600">
                        {safeFormatDate(
                          announcement.desiredDate,
                          "dd MMMM yyyy à HH:mm",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Prix</p>
                      <p className="text-sm text-gray-600">
                        {announcement.price || 0} {announcement.currency || "EUR"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Type de service</p>
                      <p className="text-sm text-gray-600">
                        {getTypeLabel(announcement.type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Dates flexibles</p>
                      <p className="text-sm text-gray-600">
                        {announcement.flexibleDates ? "Oui" : "Non"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adresses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Itinéraire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-green-600">
                    📍 Point de départ
                  </h4>
                  <p className="text-gray-600">
                    {announcement.startLocation?.address ||
                      "Adresse non renseignée"}
                  </p>
                </div>

                <div className="flex items-center justify-center py-2">
                  <Route className="h-6 w-6 text-blue-500" />
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-red-600">
                    📍 Point d'arrivée
                  </h4>
                  <p className="text-gray-600">
                    {announcement.endLocation?.address ||
                      "Adresse non renseignée"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Détails du colis si applicable */}
            {[
              "PACKAGE_DELIVERY",
              "SHOPPING",
              "INTERNATIONAL_PURCHASE",
              "CART_DROP",
            ].includes(announcement.type) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Détails du colis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {announcement.packageDetails ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {announcement.packageDetails.weight && (
                          <div>
                            <h4 className="font-medium mb-2">Poids</h4>
                            <p className="text-gray-600">
                              {announcement.packageDetails.weight} kg
                            </p>
                          </div>
                        )}
                        {announcement.packageDetails.length &&
                          announcement.packageDetails.width &&
                          announcement.packageDetails.height && (
                            <div>
                              <h4 className="font-medium mb-2">Dimensions</h4>
                              <p className="text-gray-600">
                                {announcement.packageDetails.length} x{" "}
                                {announcement.packageDetails.width} x{" "}
                                {announcement.packageDetails.height} cm
                              </p>
                            </div>
                          )}
                        {announcement.packageDetails.content && (
                          <div>
                            <h4 className="font-medium mb-2">Contenu</h4>
                            <p className="text-gray-600">
                              {announcement.packageDetails.content}
                            </p>
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium mb-2">Fragile</h4>
                          <p className="text-gray-600">
                            {announcement.packageDetails.fragile ? "Oui" : "Non"}
                          </p>
                        </div>
                      </div>

                      {announcement.packageDetails.requiresInsurance && (
                        <div>
                          <h4 className="font-medium mb-2">Assurance</h4>
                          <p className="text-gray-600">
                            Valeur assurée:{" "}
                            {announcement.packageDetails.insuredValue || 0} €
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 mb-2">
                        Détails du colis non renseignés
                      </p>
                      <p className="text-sm text-gray-500">
                        Les informations détaillées du colis (poids, dimensions,
                        contenu) n'ont pas été précisées lors de la création de
                        l'annonce.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Détails du service si applicable */}
            {announcement.serviceDetails && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Détails du service
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Type de service</h4>
                      <p className="text-gray-600">
                        {announcement.serviceDetails.serviceType}
                      </p>
                    </div>
                    {announcement.serviceDetails.numberOfPeople && (
                      <div>
                        <h4 className="font-medium mb-2">Nombre de personnes</h4>
                        <p className="text-gray-600">
                          {announcement.serviceDetails.numberOfPeople} personnes
                        </p>
                      </div>
                    )}
                    {announcement.serviceDetails.duration && (
                      <div>
                        <h4 className="font-medium mb-2">Durée</h4>
                        <p className="text-gray-600">
                          {announcement.serviceDetails.duration} minutes
                        </p>
                      </div>
                    )}
                    {announcement.serviceDetails.recurringService && (
                      <div>
                        <h4 className="font-medium mb-2">Service récurrent</h4>
                        <p className="text-gray-600">
                          {announcement.serviceDetails.recurringPattern || "Oui"}
                        </p>
                      </div>
                    )}
                  </div>

                  {announcement.serviceDetails.specialRequirements && (
                    <div>
                      <h4 className="font-medium mb-2">Exigences spéciales</h4>
                      <p className="text-gray-600">
                        {announcement.serviceDetails.specialRequirements}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pièces jointes si disponibles */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Pièces jointes ({announcement.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {announcement.attachments.map(
                      (attachment: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <Package className="h-4 w-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {attachment.filename || `Fichier ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {attachment.type || "Type inconnu"}
                            </p>
                          </div>
                          {attachment.url && (
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Évaluations si disponibles */}
            {announcement.reviews && announcement.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Évaluations ({announcement.reviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {announcement.reviews
                      .slice(0, 3)
                      .map((review: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= (review.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium">
                              {review.rating}/5
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600">
                              "{review.comment}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(review.createdAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </p>
                        </div>
                      ))}
                    {announcement.reviews.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        +{announcement.reviews.length - 3} autres évaluations
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Debug - Données de l'API (temporaire) */}
            {process.env.NODE_ENV === "development" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-red-600">
                    🐛 DEBUG - Données API (dev only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">
                      Voir les données brutes
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(announcement, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            )}

            {/* Informations supplémentaires */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Publié le</p>
                  <p className="text-sm text-gray-600">
                    {new Date(announcement.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Type de service</p>
                  <p className="text-sm text-gray-600">
                    {getTypeLabel(announcement.type)}
                  </p>
                </div>

                {announcement.urgent && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Priorité</p>
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  </div>
                )}

                {announcement.viewCount !== undefined &&
                  announcement.viewCount > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Vues</p>
                      <p className="text-sm text-gray-600">
                        {announcement.viewCount} vues
                      </p>
                    </div>
                  )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Statut actuel</p>
                  {announcement.payment?.status === "COMPLETED" ? (
                    <Badge className="bg-green-600 text-white">Payé</Badge>
                  ) : announcement.payment?.status === "PENDING" ? (
                    <Badge className="bg-yellow-400 text-gray-900">En attente de paiement</Badge>
                  ) : (
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informations sur l'auteur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Informations auteur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {announcement.author?.profile ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={announcement.author.profile.avatar} />
                      <AvatarFallback>
                        {announcement.author.profile.firstName?.[0] || "U"}
                        {announcement.author.profile.lastName?.[0] || "E"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {announcement.author.profile.firstName &&
                        announcement.author.profile.lastName
                          ? `${announcement.author.profile.firstName} ${announcement.author.profile.lastName}`
                          : "Utilisateur anonyme"}
                      </p>
                      <p className="text-sm text-gray-600">Auteur de l'annonce</p>
                    </div>
                  </div>
                ) : announcement.client?.profile ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={announcement.client.profile.avatar} />
                      <AvatarFallback>
                        {announcement.client.profile.firstName?.[0] || "C"}
                        {announcement.client.profile.lastName?.[0] || "L"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {announcement.client.profile.firstName &&
                        announcement.client.profile.lastName
                          ? `${announcement.client.profile.firstName} ${announcement.client.profile.lastName}`
                          : "Client anonyme"}
                      </p>
                      <p className="text-sm text-gray-600">Client particulier</p>
                    </div>
                  </div>
                ) : announcement.merchant?.profile ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={announcement.merchant.profile.avatar} />
                      <AvatarFallback>
                        {announcement.merchant.profile.businessName?.[0] ||
                          announcement.merchant.profile.firstName?.[0] ||
                          "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {announcement.merchant.profile.businessName ||
                          (announcement.merchant.profile.firstName &&
                          announcement.merchant.profile.lastName
                            ? `${announcement.merchant.profile.firstName} ${announcement.merchant.profile.lastName}`
                            : "Commerçant")}
                      </p>
                      <p className="text-sm text-gray-600">
                        Commerçant partenaire
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>EC</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Utilisateur EcoDeli</p>
                      <p className="text-sm text-gray-600">
                        Profil non disponible
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Candidats (si statut ACTIVE) */}
            {canViewCandidates &&
              announcement.routeMatches &&
              announcement.routeMatches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Correspondances de trajets (
                      {announcement.routeMatches.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        {announcement.routeMatches.length} trajets compatibles
                        trouvés.
                      </p>
                      <Link
                        href={`/client/announcements/${id}/candidates`}
                        className="w-full"
                      >
                        <Button className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          Voir tous les candidats
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Actions disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Boutons selon le statut */}
                {unifiedStatus === "DRAFT" && (
                  <div className="space-y-2">
                    <Link
                      href={`/client/announcements/${id}/edit`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier l'annonce
                      </Button>
                    </Link>
                    <Link
                      href={`/client/announcements/${id}/payment`}
                      className="w-full"
                    >
                      <Button className="w-full">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Procéder au paiement
                      </Button>
                    </Link>
                  </div>
                )}

                {unifiedStatus === "ACTIVE" && (
                  <div className="space-y-2">
                    {canViewCandidates && (
                      <Link
                        href={`/client/announcements/${id}/candidates`}
                        className="w-full"
                      >
                        <Button className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          Voir candidats ({announcement.routeMatches?.length || 0}
                          )
                        </Button>
                      </Link>
                    )}
                    <Link
                      href={`/client/announcements/${id}/tracking`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Suivi en temps réel
                      </Button>
                    </Link>
                  </div>
                )}

                {["MATCHED", "IN_PROGRESS"].includes(unifiedStatus) && (
                  <div className="space-y-2">
                    <Link
                      href={`/client/announcements/${id}/tracking`}
                      className="w-full"
                    >
                      <Button className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Suivre la livraison
                      </Button>
                    </Link>
                    <Link
                      href={`/client/announcements/${id}/validation-code`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Code de validation
                      </Button>
                    </Link>
                    {unifiedStatus === "MATCHED" && (
                      <Link
                        href={`/client/announcements/${id}/payment`}
                        className="w-full"
                      >
                        <Button variant="outline" className="w-full">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Gérer le paiement
                        </Button>
                      </Link>
                    )}
                  </div>
                )}

                {unifiedStatus === "COMPLETED" && (
                  <div className="space-y-2">
                    <Link
                      href={`/client/announcements/${id}/tracking`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Voir l'historique
                      </Button>
                    </Link>
                    <Link
                      href={`/client/announcements/${id}/review`}
                      className="w-full"
                    >
                      <Button className="w-full">
                        <Star className="h-4 w-4 mr-2" />
                        Évaluer le livreur
                      </Button>
                    </Link>
                  </div>
                )}

                {unifiedStatus === "CANCELLED" && (
                  <div className="space-y-2">
                    <Link
                      href={`/client/announcements/${id}/tracking`}
                      className="w-full"
                    >
                      <Button variant="outline" className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Voir l'historique
                      </Button>
                    </Link>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Cette annonce a été annulée. Aucune action n'est possible.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Livraison en cours */}
            {hasDelivery && announcement.delivery && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Livraison en cours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Une livraison est associée à cette annonce. Consultez la
                      page de suivi pour plus de détails.
                    </AlertDescription>
                  </Alert>

                  <Link
                    href={`/client/announcements/${id}/tracking`}
                    className="w-full"
                  >
                    <Button className="w-full">
                      <MapPin className="h-4 w-4 mr-2" />
                      Voir le suivi de livraison
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action
              est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
            >
              {actionLoading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
