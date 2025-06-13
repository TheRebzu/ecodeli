"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Save,
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Calendar,
  Truck,
} from "lucide-react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

type DelivererStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "PENDING_VERIFICATION";

// Schema de validation pour l'édition d'un livreur
const editDelivererSchema = z.object({
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .max(50, "Le prénom est trop long"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .max(50, "Le nom est trop long"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]),
  hasVehicle: z.boolean(),
  vehicleType: z.string().optional(),
  preferredZones: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type EditDelivererFormData = z.infer<typeof editDelivererSchema>;

export default function DelivererEditPage() {
  const router = useRouter();
  const params = useParams();
  const delivererId = params.id as string;
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();

  // Récupérer les données du livreur
  const {
    data: delivererData,
    isLoading,
    error,
  } = api.admin.deliverers.getById.useQuery({
    id: delivererId,
  });

  const deliverer = delivererData;

  const updateDelivererMutation = api.admin.deliverers.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Livreur mis à jour",
        description:
          "Les informations du livreur ont été mises à jour avec succès.",
      });
      router.push(`/admin/deliverers/${delivererId}`);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour: " + error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<EditDelivererFormData>({
    resolver: zodResolver(editDelivererSchema),
    defaultValues: {
      firstName: deliverer?.firstName || "",
      lastName: deliverer?.lastName || "",
      email: deliverer?.email || "",
      phone: deliverer?.phone || "",
      status: deliverer?.status || "PENDING_VERIFICATION",
      hasVehicle: deliverer?.hasVehicle || false,
      vehicleType: deliverer?.vehicleType || "",
      preferredZones: deliverer?.preferredZones || [],
      notes: "",
    },
  });

  // Update form when deliverer data loads
  if (deliverer && !form.getValues().firstName) {
    form.reset({
      firstName: deliverer.firstName,
      lastName: deliverer.lastName,
      email: deliverer.email,
      phone: deliverer.phone || "",
      status: deliverer.status,
      hasVehicle: deliverer.hasVehicle || false,
      vehicleType: deliverer.vehicleType || "",
      preferredZones: deliverer.preferredZones || [],
      notes: "",
    });
  }

  const onSubmit = async (data: EditDelivererFormData) => {
    try {
      await updateDelivererMutation.mutateAsync({
        id: delivererId,
        ...data,
      });
    } catch (error) {
      console.error("Error updating deliverer:", error);
    }
  };

  // Helper functions for badges
  const getStatusBadge = (status: DelivererStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Actif</Badge>;
      case "PENDING_VERIFICATION":
        return (
          <Badge className="bg-yellow-500">En attente de vérification</Badge>
        );
      case "SUSPENDED":
        return <Badge className="bg-red-500">Suspendu</Badge>;
      case "INACTIVE":
        return <Badge className="bg-gray-500">Inactif</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-72" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!deliverer) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Livreur introuvable
          </h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <h2 className="text-xl font-semibold mb-4">
              Le livreur demandé est introuvable
            </h2>
            <Button asChild>
              <Link href="/admin/deliverers">
                Retour à la gestion des livreurs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Éditer le livreur</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                {deliverer.firstName} {deliverer.lastName}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 text-base">
                {getStatusBadge(deliverer.status)}
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-600 border-yellow-200"
                >
                  🧪 Mode Test
                </Badge>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/deliverers/${delivererId}`}>
                  Voir les détails
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Informations générales</TabsTrigger>
              <TabsTrigger value="vehicle">Véhicule et zones</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom de famille</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de téléphone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un statut" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Actif</SelectItem>
                              <SelectItem value="INACTIVE">Inactif</SelectItem>
                              <SelectItem value="SUSPENDED">
                                Suspendu
                              </SelectItem>
                              <SelectItem value="PENDING_VERIFICATION">
                                En attente de vérification
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes administratives</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes internes concernant cette modification..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Ces notes seront enregistrées dans l'historique des
                          modifications.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateDelivererMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateDelivererMutation.isPending
                        ? "Sauvegarde..."
                        : "Sauvegarder"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="vehicle" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Informations véhicule et zones
                  </CardTitle>
                  <CardDescription>
                    Gérer les informations de transport et zones de livraison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="hasVehicle"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Possède un véhicule</FormLabel>
                              <FormDescription>
                                Cochez si le livreur possède un véhicule de
                                transport
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch("hasVehicle") && (
                        <FormField
                          control={form.control}
                          name="vehicleType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type de véhicule</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un type de véhicule" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="BICYCLE">Vélo</SelectItem>
                                  <SelectItem value="SCOOTER">
                                    Scooter
                                  </SelectItem>
                                  <SelectItem value="MOTORCYCLE">
                                    Moto
                                  </SelectItem>
                                  <SelectItem value="CAR">Voiture</SelectItem>
                                  <SelectItem value="VAN">
                                    Camionnette
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.back()}
                        >
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateDelivererMutation.isPending}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {updateDelivererMutation.isPending
                            ? "Sauvegarde..."
                            : "Sauvegarder"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
