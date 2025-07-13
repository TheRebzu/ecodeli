"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  User,
  Package,
  Clock,
  Camera,
  QrCode,
  Phone,
  FileText,
} from "lucide-react";

const validationSchema = z.object({
  validationCode: z
    .string()
    .length(6, "Le code doit contenir exactement 6 chiffres"),
  recipientName: z.string().optional(),
  notes: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

type ValidationForm = z.infer<typeof validationSchema>;

interface DeliveryDetails {
  id: string;
  status: string;
  validationCode: string;
  pickupLocation: any;
  deliveryLocation: any;
  scheduledPickupTime?: string;
  scheduledDeliveryTime?: string;
  actualPickupTime?: string;
  actualDeliveryTime?: string;
  notes?: string;

  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    basePrice: number;
    finalPrice: number;
    pickupAddress: string;
    deliveryAddress: string;
    client: {
      id: string;
      name: string;
      phone?: string;
    };
    packageDetails?: {
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
      fragile?: boolean;
      insuredValue?: number;
    };
  };

  payment?: {
    amount: number;
    status: string;
    paidAt?: string;
  };

  proofOfDelivery?: {
    id: string;
    recipientName?: string;
    validatedWithCode: boolean;
    createdAt: string;
  };

  tracking: Array<{
    id: string;
    status: string;
    message: string;
    location?: any;
    createdAt: string;
  }>;
}

interface DeliveryValidationPageProps {
  deliveryId: string;
}

export function DeliveryValidationPage({
  deliveryId,
}: DeliveryValidationPageProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryDetails | null>(null);
  const [canValidate, setCanValidate] = useState(false);

  const form = useForm<ValidationForm>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      validationCode: "",
      recipientName: "",
      notes: "",
      photos: [],
    },
  });

  useEffect(() => {
    loadDeliveryDetails();
  }, [deliveryId]);

  const loadDeliveryDetails = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/deliverer/deliveries/${deliveryId}`);
      if (!response.ok) {
        throw new Error("Impossible de charger les détails de la livraison");
      }

      const data = await response.json();
      setDelivery(data.delivery);
      setCanValidate(data.canValidate);
    } catch (error) {
      console.error("Erreur chargement livraison:", error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de charger les détails de la livraison",
        variant: "destructive",
      });
      router.push("/deliverer/deliveries");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ValidationForm) => {
    try {
      setSubmitting(true);

      const response = await fetch(`/api/deliverer/deliveries/${deliveryId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la validation");
      }

      const result = await response.json();

      toast({
        title: "✅ Livraison validée !",
        description: result.message || "La livraison a été validée avec succès",
      });

      // Rediriger vers la liste des livraisons
      router.push("/deliverer/deliveries");
    } catch (error) {
      console.error("Erreur validation:", error);
      toast({
        title: "❌ Erreur de validation",
        description:
          error instanceof Error ? error.message : "Une erreur s'est produite",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non spécifié";
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      PACKAGE_DELIVERY: "📦 Colis standard",
      DOCUMENT_DELIVERY: "📄 Documents",
      CART_DROP: "🛒 Lâcher de chariot",
      SHOPPING_DELIVERY: "🛍️ Courses",
      AIRPORT_TRANSFER: "✈️ Aéroport",
      INTERNATIONAL_PURCHASE: "🌍 International",
      FRAGILE_DELIVERY: "⚠️ Fragile",
      URGENT_DELIVERY: "⚡ Express",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des détails de la livraison...</span>
      </div>
    );
  }

  if (!delivery) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Livraison non trouvée ou inaccessible.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canValidate) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cette livraison ne peut pas être validée dans son état actuel.
            Statut actuel: {delivery.status}
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => router.push("/deliverer/deliveries")}
          variant="outline"
        >
          ← Retour aux livraisons
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ✅ Validation de Livraison
            </h1>
            <p className="text-gray-600">
              Confirmez la livraison en saisissant le code de validation
            </p>
          </div>
          <div className="text-right">
            <Badge className="bg-green-500 text-white">
              En cours de livraison
            </Badge>
          </div>
        </div>
      </div>

      {/* Détails de la livraison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Détails de la livraison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-lg mb-3">
                {delivery.announcement.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {delivery.announcement.description}
              </p>

              <div className="space-y-2">
                <Badge variant="outline">
                  {getTypeLabel(delivery.announcement.type)}
                </Badge>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(delivery.announcement.finalPrice)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Client */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
                  <User className="h-4 w-4" />
                  Client
                </div>
                <p className="font-medium">
                  {delivery.announcement.client.name}
                </p>
                {delivery.announcement.client.phone && (
                  <a
                    href={`tel:${delivery.announcement.client.phone}`}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Phone className="h-4 w-4" />
                    {delivery.announcement.client.phone}
                  </a>
                )}
              </div>

              {/* Code de validation */}
              <div className="border-l-4 border-red-500 pl-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-800 mb-2">
                  <QrCode className="h-4 w-4" />
                  Code de validation à donner au client
                </div>
                <div className="text-2xl font-bold text-red-600 font-mono">
                  {delivery.validationCode}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Le client doit vous donner ce code pour confirmer la réception
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Adresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Enlèvement:</span>
              </div>
              <p className="text-sm text-gray-600 ml-6">
                {delivery.announcement.pickupAddress}
              </p>
              {delivery.actualPickupTime && (
                <p className="text-xs text-gray-500 ml-6">
                  ✅ Récupéré le {formatDate(delivery.actualPickupTime)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="font-medium">Livraison:</span>
              </div>
              <p className="text-sm text-gray-600 ml-6">
                {delivery.announcement.deliveryAddress}
              </p>
              {delivery.scheduledDeliveryTime && (
                <p className="text-xs text-gray-500 ml-6">
                  📅 Prévue pour {formatDate(delivery.scheduledDeliveryTime)}
                </p>
              )}
            </div>
          </div>

          {/* Détails du colis */}
          {delivery.announcement.packageDetails && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium mb-2">Détails du colis:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {delivery.announcement.packageDetails.weight && (
                  <div>
                    Poids:{" "}
                    <strong>
                      {delivery.announcement.packageDetails.weight}kg
                    </strong>
                  </div>
                )}
                {delivery.announcement.packageDetails.length && (
                  <div>
                    Taille:{" "}
                    <strong>
                      {delivery.announcement.packageDetails.length}×
                      {delivery.announcement.packageDetails.width}×
                      {delivery.announcement.packageDetails.height}cm
                    </strong>
                  </div>
                )}
                {delivery.announcement.packageDetails.fragile && (
                  <div className="text-red-600">
                    ⚠️ <strong>Fragile</strong>
                  </div>
                )}
                {delivery.announcement.packageDetails.insuredValue && (
                  <div>
                    Assuré:{" "}
                    <strong>
                      {formatPrice(
                        delivery.announcement.packageDetails.insuredValue,
                      )}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulaire de validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Validation de la livraison
          </CardTitle>
          <CardDescription>
            Saisissez le code de validation fourni par le client pour confirmer
            la livraison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="validationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code de validation *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-xl font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Code à 6 chiffres fourni par le client lors de la
                      réception
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du destinataire (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom de la personne qui a reçu le colis"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Si différent du client principal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes de livraison (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Commentaires sur la livraison..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Informations complémentaires sur la livraison
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/deliverer/deliveries")}
                >
                  Annuler
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider la livraison
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              📋 Instructions de validation
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Remettez le colis au destinataire</li>
              <li>
                • Demandez-lui de vous fournir le code de validation à 6
                chiffres
              </li>
              <li>• Saisissez le code dans le formulaire ci-dessus</li>
              <li>• Ajoutez des notes si nécessaire</li>
              <li>• Validez pour finaliser la livraison</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
