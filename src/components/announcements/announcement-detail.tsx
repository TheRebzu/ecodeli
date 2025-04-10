"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapView } from "@/components/ui/map-view";
import { Carousel } from "@/components/ui/carousel";
import { UserRating } from "@/components/ui/user-rating";
import { Loader2, MapPin, Calendar, Package, Info, Euro, Truck, Shield, MessageSquare } from "lucide-react";

// Statuts d'annonce traduits
const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Active",
  ASSIGNED: "Attribuée",
  IN_TRANSIT: "En transit",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
  COMPLETED: "Terminée",
};

// Types d'annonce traduits
const typeLabels: Record<string, string> = {
  CLIENT_REQUEST: "Demande client",
  MERCHANT_REQUEST: "Demande commerçant",
  COURIER_ROUTE: "Trajet proposé",
  SERVICE_REQUEST: "Service à la personne",
};

// Types de colis traduits
const packageTypeLabels: Record<string, string> = {
  SMALL_ENVELOPE: "Petite enveloppe",
  LARGE_ENVELOPE: "Grande enveloppe",
  SMALL_PACKAGE: "Petit paquet",
  MEDIUM_PACKAGE: "Paquet moyen",
  LARGE_PACKAGE: "Grand paquet",
  EXTRA_LARGE: "Très grand colis",
  PALLET: "Palette",
};

// Types d'assurance traduits
const insuranceLabels: Record<string, string> = {
  NONE: "Aucune assurance",
  BASIC: "Assurance basique (jusqu'à 115€)",
  PREMIUM: "Assurance premium (jusqu'à 3000€)",
  CUSTOM: "Assurance personnalisée",
};

// Schéma pour une nouvelle offre
const bidSchema = z.object({
  amount: z.number().min(1, {
    message: "Le montant doit être supérieur à 0",
  }),
  message: z.string().min(10, {
    message: "Votre message doit contenir au moins 10 caractères",
  }),
});

type BidFormValues = z.infer<typeof bidSchema>;

// Types pour les bids
type Bid = {
  id: string;
  userId: string;
  amount: number;
  message: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
};

// Statuts de l'offre traduits
const bidStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

// Types pour les props du composant
interface AnnouncementDetailProps {
  announcement: {
    id: string;
    title: string;
    description: string;
    type: string;
    packageType?: string;
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
    isFragile: boolean;
    requiresRefrigeration: boolean;
    pickupAddress: string;
    pickupCity: string;
    pickupPostalCode: string;
    pickupCountry: string;
    pickupCoordinates?: { lat: number; lng: number };
    deliveryAddress: string;
    deliveryCity: string;
    deliveryPostalCode: string;
    deliveryCountry: string;
    deliveryCoordinates?: { lat: number; lng: number };
    pickupDate: string;
    deliveryDeadline: string;
    price?: number;
    isNegotiable: boolean;
    insuranceOption: string;
    insuranceAmount?: number;
    packageImages: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
    customer?: {
      id: string;
      name: string;
      image?: string;
      rating?: number;
    };
    merchant?: {
      id: string;
      businessName: string;
      businessAddress?: string;
      rating?: number;
    };
    courier?: {
      id: string;
      name: string;
      image?: string;
      vehicleType?: string;
      rating?: number;
    };
    bids: Bid[];
    distance?: number;
  };
  userRole: "CLIENT" | "COURIER" | "MERCHANT" | "PROVIDER" | "ADMIN";
  userId: string;
}

export function AnnouncementDetail({ announcement, userRole, userId }: AnnouncementDetailProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  
  // Vérifier si l'utilisateur est le propriétaire de l'annonce
  const isOwner = 
    (announcement.customer?.id === userId) || 
    (announcement.merchant?.id === userId) || 
    (announcement.courier?.id === userId);
  
  // Vérifier si l'utilisateur a déjà fait une offre
  const userBid = announcement.bids.find(bid => bid.userId === userId);
  
  // Formulaire pour faire une offre
  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      amount: announcement.price,
      message: "",
    },
  });

  // Faire une offre
  const onSubmitBid = async (data: BidFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Une erreur est survenue lors de la soumission de l'offre.");
      }
      
      toast.success("Votre offre a été soumise avec succès!");
      setBidDialogOpen(false);
      router.refresh();
      
    } catch (error) {
      console.error("Erreur lors de la soumission de l'offre:", error);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accepter une offre
  const acceptBid = async () => {
    if (!selectedBidId) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/bids/${selectedBidId}/accept`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Une erreur est survenue lors de l'acceptation de l'offre.");
      }
      
      toast.success("Offre acceptée avec succès!");
      setConfirmDialogOpen(false);
      router.refresh();
      
    } catch (error) {
      console.error("Erreur lors de l'acceptation de l'offre:", error);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Annuler une annonce
  const cancelAnnouncement = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/announcements/${announcement.id}/cancel`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Une erreur est survenue lors de l'annulation de l'annonce.");
      }
      
      toast.success("Annonce annulée avec succès!");
      router.refresh();
      
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'annonce:", error);
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatter la dimension du colis
  const formatDimensions = () => {
    if (announcement.width && announcement.height && announcement.length) {
      return `${announcement.length} × ${announcement.width} × ${announcement.height} cm`;
    }
    return "Non spécifié";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{announcement.title}</h2>
          <p className="text-muted-foreground">
            Publiée le {format(new Date(announcement.createdAt), "dd MMMM yyyy", { locale: fr })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className="text-sm">{statusLabels[announcement.status]}</Badge>
          <Badge variant="outline" className="text-sm">{typeLabels[announcement.type]}</Badge>
        </div>
      </div>
      
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="bids">
            Offres ({announcement.bids.length})
          </TabsTrigger>
          {announcement.pickupCoordinates && announcement.deliveryCoordinates && (
            <TabsTrigger value="map">Carte</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Images du colis */}
              {announcement.packageImages && announcement.packageImages.length > 0 && (
                <Card>
                  <CardContent className="p-0 overflow-hidden rounded-md">
                    <Carousel
                      images={announcement.packageImages}
                      height={400}
                    />
                  </CardContent>
                </Card>
              )}
              
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{announcement.description}</p>
                </CardContent>
              </Card>
              
              {/* Détails du trajet */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails du trajet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Point de ramassage */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Point de ramassage
                      </h4>
                      <div className="pl-5 space-y-1">
                        <p>{announcement.pickupAddress}</p>
                        <p>
                          {announcement.pickupPostalCode} {announcement.pickupCity}
                        </p>
                        <p>{announcement.pickupCountry}</p>
                      </div>
                    </div>
                    
                    {/* Point de livraison */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Point de livraison
                      </h4>
                      <div className="pl-5 space-y-1">
                        <p>{announcement.deliveryAddress}</p>
                        <p>
                          {announcement.deliveryPostalCode} {announcement.deliveryCity}
                        </p>
                        <p>{announcement.deliveryCountry}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date de ramassage */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Date de ramassage
                      </h4>
                      <p className="pl-5">
                        {format(new Date(announcement.pickupDate), "EEEE d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    
                    {/* Date limite de livraison */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Date limite de livraison
                      </h4>
                      <p className="pl-5">
                        {format(new Date(announcement.deliveryDeadline), "EEEE d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  
                  {announcement.distance && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Distance: environ {Math.round(announcement.distance)} km
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Détails du colis */}
              {announcement.packageType && (
                <Card>
                  <CardHeader>
                    <CardTitle>Détails du colis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Type de colis</p>
                        <p className="font-medium">{packageTypeLabels[announcement.packageType]}</p>
                      </div>
                      
                      {announcement.weight && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Poids</p>
                          <p className="font-medium">{announcement.weight} kg</p>
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Dimensions</p>
                        <p className="font-medium">{formatDimensions()}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Contenu fragile</p>
                        <p className="font-medium">{announcement.isFragile ? "Oui" : "Non"}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Nécessite réfrigération</p>
                        <p className="font-medium">{announcement.requiresRefrigeration ? "Oui" : "Non"}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Assurance</p>
                        <p className="font-medium">{insuranceLabels[announcement.insuranceOption]}</p>
                        {announcement.insuranceAmount && (
                          <p className="text-sm text-muted-foreground">
                            Montant assuré: {announcement.insuranceAmount} €
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="space-y-6">
              {/* Tarif */}
              <Card>
                <CardHeader>
                  <CardTitle>Tarif</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium">{announcement.price} €</p>
                    {announcement.isNegotiable && (
                      <Badge variant="outline">Négociable</Badge>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Si l'utilisateur est un livreur et que l'annonce est ouverte */}
                    {userRole === "COURIER" && 
                     announcement.status === "ACTIVE" && 
                     !isOwner &&
                     !userBid && (
                      <Button 
                        className="w-full" 
                        onClick={() => setBidDialogOpen(true)}
                      >
                        Faire une offre
                      </Button>
                    )}
                    
                    {/* Si l'utilisateur est un livreur et a déjà fait une offre */}
                    {userRole === "COURIER" && 
                     announcement.status === "ACTIVE" && 
                     !isOwner &&
                     userBid && (
                      <Alert>
                        <AlertTitle>Offre en cours</AlertTitle>
                        <AlertDescription>
                          Vous avez proposé {userBid.amount} € pour cette livraison.
                          <br />
                          <span className="text-sm text-muted-foreground">
                            Statut: {bidStatusLabels[userBid.status]}
                          </span>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Si l'utilisateur est le propriétaire et l'annonce est ouverte */}
                    {isOwner && announcement.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={cancelAnnouncement}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Annulation...
                          </>
                        ) : (
                          "Annuler l'annonce"
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Annonceur */}
              <Card>
                <CardHeader>
                  <CardTitle>Annonceur</CardTitle>
                </CardHeader>
                <CardContent>
                  {announcement.customer && (
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={announcement.customer.image} />
                        <AvatarFallback>
                          {announcement.customer.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{announcement.customer.name}</p>
                        {announcement.customer.rating && (
                          <UserRating rating={announcement.customer.rating} />
                        )}
                      </div>
                    </div>
                  )}
                  
                  {announcement.merchant && (
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback>
                          {announcement.merchant.businessName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{announcement.merchant.businessName}</p>
                        {announcement.merchant.businessAddress && (
                          <p className="text-sm text-muted-foreground">
                            {announcement.merchant.businessAddress}
                          </p>
                        )}
                        {announcement.merchant.rating && (
                          <UserRating rating={announcement.merchant.rating} />
                        )}
                      </div>
                    </div>
                  )}
                  
                  {announcement.courier && (
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={announcement.courier.image} />
                        <AvatarFallback>
                          {announcement.courier.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{announcement.courier.name}</p>
                        {announcement.courier.vehicleType && (
                          <p className="text-sm text-muted-foreground">
                            Véhicule: {announcement.courier.vehicleType}
                          </p>
                        )}
                        {announcement.courier.rating && (
                          <UserRating rating={announcement.courier.rating} />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Infos supplémentaires */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Référence</span>
                    <span>{announcement.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <Badge variant="outline">{statusLabels[announcement.status]}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date de création</span>
                    <span>{format(new Date(announcement.createdAt), "dd/MM/yyyy", { locale: fr })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mise à jour</span>
                    <span>{format(new Date(announcement.updatedAt), "dd/MM/yyyy", { locale: fr })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="bids" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Offres reçues</CardTitle>
              <CardDescription>
                {announcement.bids.length === 0
                  ? "Aucune offre reçue pour le moment."
                  : `${announcement.bids.length} offre(s) reçue(s) pour cette annonce.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {announcement.bids.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-4">Aucune offre n'a encore été faite pour cette annonce.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcement.bids.map((bid) => (
                    <Card key={bid.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage src={bid.user.image} />
                              <AvatarFallback>{bid.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{bid.user.name}</p>
                              {bid.user.rating && (
                                <UserRating rating={bid.user.rating} />
                              )}
                            </div>
                          </div>
                          <Badge variant={
                            bid.status === "ACCEPTED" ? "default" :
                            bid.status === "REJECTED" ? "destructive" :
                            "outline"
                          }>
                            {bidStatusLabels[bid.status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <Euro className="h-4 w-4 text-primary" />
                          <span className="font-medium">{bid.amount} €</span>
                          <span className="text-muted-foreground text-sm">
                            (proposé le {format(new Date(bid.createdAt), "dd/MM/yyyy", { locale: fr })})
                          </span>
                        </div>
                        <p className="text-sm">{bid.message}</p>
                      </CardContent>
                      {isOwner && bid.status === "PENDING" && announcement.status === "ACTIVE" && (
                        <CardFooter>
                          <Button
                            size="sm"
                            className="ml-auto"
                            onClick={() => {
                              setSelectedBidId(bid.id);
                              setConfirmDialogOpen(true);
                            }}
                          >
                            Accepter cette offre
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {announcement.pickupCoordinates && announcement.deliveryCoordinates && (
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Carte du trajet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px]">
                  <MapView
                    pickupCoordinates={announcement.pickupCoordinates}
                    deliveryCoordinates={announcement.deliveryCoordinates}
                    height={500}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Dialog pour faire une offre */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Faire une offre</DialogTitle>
            <DialogDescription>
              Proposez votre prix pour assurer cette livraison.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitBid)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant proposé (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 15.00"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>
                      Montant que vous demandez pour effectuer cette livraison.
                      {announcement.price && field.value && field.value < announcement.price && (
                        <p className="text-green-600">
                          {Math.round((1 - field.value / announcement.price) * 100)}% moins cher que le prix demandé.
                        </p>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Présentez votre offre et indiquez vos disponibilités..."
                        className="resize-none min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ajoutez des détails sur votre offre, comme votre disponibilité, votre expérience, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setBidDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer mon offre"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de confirmation pour accepter une offre */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer l'acceptation</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir accepter cette offre ? 
              L'annonce sera marquée comme attribuée et les autres offres seront automatiquement refusées.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={acceptBid} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}