"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateAnnouncementSchema,
  type UpdateAnnouncementInput,
  AnnouncementType,
  AnnouncementStatus,
} from "@/features/announcements/schemas/announcement.schema";
import { Announcement } from "@/features/announcements/types/announcement.types";
import {
  Package,
  Users,
  Plane,
  ShoppingCart,
  Globe,
  Home,
  Heart,
  ShoppingCartIcon,
  ArrowLeft,
  Save,
  Edit,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const announcementTypes = [
  {
    value: "PACKAGE_DELIVERY",
    label: "Transport de colis",
    description: "Livraison de colis (intégral ou partiel)",
    icon: Package,
    color: "bg-blue-500",
  },
  {
    value: "PERSON_TRANSPORT",
    label: "Transport de personnes",
    description: "Transport quotidien de personnes",
    icon: Users,
    color: "bg-green-500",
  },
  {
    value: "AIRPORT_TRANSFER",
    label: "Transfert aéroport",
    description: "Transport vers/depuis l'aéroport",
    icon: Plane,
    color: "bg-purple-500",
  },
  {
    value: "SHOPPING",
    label: "Courses",
    description: "Courses avec liste fournie au livreur",
    icon: ShoppingCart,
    color: "bg-orange-500",
  },
  {
    value: "INTERNATIONAL_PURCHASE",
    label: "Achats internationaux",
    description: "Achats depuis l'étranger",
    icon: Globe,
    color: "bg-red-500",
  },
  {
    value: "HOME_SERVICE",
    label: "Services à domicile",
    description: "Ménage, jardinage, bricolage...",
    icon: Home,
    color: "bg-yellow-500",
  },
  {
    value: "PET_SITTING",
    label: "Garde d'animaux",
    description: "Garde d'animaux à domicile",
    icon: Heart,
    color: "bg-pink-500",
  },
  {
    value: "CART_DROP",
    label: "Lâcher de chariot",
    description: "Livraison à domicile depuis magasin",
    icon: ShoppingCartIcon,
    color: "bg-indigo-500",
  },
];

export default function EditAnnouncementPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("client.announcements");
  const { toast } = useToast();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");

  const form = useForm<any>({
    // resolver: zodResolver(updateAnnouncementSchema),
    defaultValues: {
      id: id as string,
      title: "",
      description: "",
      type: "PACKAGE_DELIVERY",
      estimatedPrice: 0,
      currency: "EUR",
      isUrgent: false,
      flexibleDates: false,
      specialInstructions: "",
      startLocation: {
        address: "",
        city: "",
        postalCode: "",
        country: "FR",
      },
      endLocation: {
        address: "",
        city: "",
        postalCode: "",
        country: "FR",
      },
    },
  });

  useEffect(() => {
    if (id && user) {
      fetchAnnouncement();
    }
  }, [id, user]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Erreur lors de la récupération de l'annonce",
        );
      }

      const data = await response.json();
      setAnnouncement(data);
      setSelectedType(data.type);

      // Remplir le formulaire avec les données existantes
      form.reset({
        id: id,
        title: data.title,
        description: data.description,
        type: data.type as AnnouncementType,
        price: data.price,
        currency: data.currency,
        urgent: data.urgent,
        flexibleDates: data.flexibleDates,
        specialInstructions: data.specialInstructions || "",
        desiredDate: data.desiredDate
          ? new Date(data.desiredDate).toISOString().slice(0, 16)
          : undefined,
        startLocation: data.startLocation,
        endLocation: data.endLocation,
        packageDetails: data.packageDetails,
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'annonce",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }

      const result = await response.json();

      toast({
        title: "Succès",
        description: "Annonce mise à jour avec succès",
      });

      router.push(`/client/announcements/${id}`);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'annonce",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTypeOptions = () => [
    { value: "PACKAGE_DELIVERY", label: "Livraison de colis" },
    { value: "PERSON_TRANSPORT", label: "Transport de personne" },
    { value: "AIRPORT_TRANSFER", label: "Transfert aéroport" },
    { value: "SHOPPING", label: "Courses" },
    { value: "INTERNATIONAL_PURCHASE", label: "Achat international" },
    { value: "PET_SITTING", label: "Garde d'animaux" },
    { value: "HOME_SERVICE", label: "Service à domicile" },
    { value: "CART_DROP", label: "Lâcher de chariot" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Annonce non trouvée
          </h2>
          <p className="text-gray-600 mb-4">
            Cette annonce n'existe pas ou a été supprimée
          </p>
          <Button onClick={() => router.push("/client/announcements")}>
            Retour aux annonces
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier l'annonce"
        description={`Modification de "${announcement.title}"`}
        action={
          <div className="flex gap-2">
            <Link href={`/client/announcements/${id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
          </div>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulaire principal */}
            <div className="lg:col-span-2 space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Informations générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titre de l'annonce</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Titre descriptif de votre annonce"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Décrivez votre demande en détail..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de service</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez le type de service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getTypeOptions().map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Instructions spéciales (optionnel)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ajoutez des instructions particulières..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Adresses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Adresses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse de départ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Adresse complète de départ"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pickupAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville de départ</FormLabel>
                          <FormControl>
                            <Input placeholder="Ville" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pickupAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="Code postal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse d'arrivée</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Adresse complète d'arrivée"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville d'arrivée</FormLabel>
                          <FormControl>
                            <Input placeholder="Ville" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code postal</FormLabel>
                          <FormControl>
                            <Input placeholder="Code postal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Détails du colis (si applicable) */}
              {form.watch("type") === "PACKAGE_DELIVERY" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Détails du colis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="packageDetails.weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Poids (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="packageDetails.fragile"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Fragile
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Le colis nécessite une manipulation délicate
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="packageDetails.length"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longueur (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="packageDetails.width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Largeur (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="packageDetails.height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hauteur (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="packageDetails.content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contenu du colis</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Décrivez le contenu du colis..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Planification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Planification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date souhaitée</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFlexibleDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Dates flexibles
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Accepter des dates proches
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Tarification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tarification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="estimatedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isUrgent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Urgent</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Annonce prioritaire (supplément)
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button type="submit" className="w-full" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving
                      ? "Enregistrement..."
                      : "Enregistrer les modifications"}
                  </Button>

                  <Link href={`/client/announcements/${id}`}>
                    <Button variant="outline" className="w-full">
                      Annuler
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
