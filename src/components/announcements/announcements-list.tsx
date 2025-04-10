"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, Package, Euro } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { MapView } from "@/components/ui/map-view";
import { cn } from "@/lib/utils";

// Définir le type d'une annonce
type Announcement = {
  id: string;
  title: string;
  description: string;
  type: string;
  packageType: string;
  weight: number;
  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  pickupDate: string;
  deliveryDeadline: string;
  price: number;
  status: string;
  createdAt: string;
  packageImages: string[];
  isFragile: boolean;
  requiresRefrigeration: boolean;
  customer?: {
    id: string;
    name: string;
    rating?: number;
  };
  merchant?: {
    id: string;
    businessName: string;
    rating?: number;
  };
  courier?: {
    id: string;
    name: string;
    rating?: number;
  };
  bids: number;
};

// Schéma de validation pour les filtres
const filterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["ALL", "CLIENT_REQUEST", "MERCHANT_REQUEST", "COURIER_ROUTE", "SERVICE_REQUEST"]).default("ALL"),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
  fromDate: z.date().nullable().optional(),
  toDate: z.date().nullable().optional(),
  status: z.enum(["ALL", "ACTIVE", "PENDING", "ASSIGNED", "COMPLETED"]).default("ALL"),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

type FilterValues = z.infer<typeof filterSchema>;

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

// Options de tri
const sortOptions = [
  { value: "createdAt", label: "Date de création" },
  { value: "pickupDate", label: "Date de ramassage" },
  { value: "deliveryDeadline", label: "Date de livraison" },
  { value: "price", label: "Prix" },
  { value: "weight", label: "Poids" },
];

export function AnnouncementsList({ 
  userId,
  status
}: { 
  userId?: string;
  status?: string[] 
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialiser le formulaire avec les paramètres de recherche
  const form = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      search: searchParams.get("search") || undefined,
      type: (searchParams.get("type") as FilterValues["type"]) || "ALL",
      fromCity: searchParams.get("fromCity") || undefined,
      toCity: searchParams.get("toCity") || undefined,
      fromDate: searchParams.get("fromDate") ? new Date(searchParams.get("fromDate") as string) : null,
      toDate: searchParams.get("toDate") ? new Date(searchParams.get("toDate") as string) : null,
      status: (searchParams.get("status") as FilterValues["status"]) || "ALL",
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    },
  });

  // Charger les annonces
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      // Construire les paramètres de recherche
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      // Ajouter les filtres du formulaire
      const values = form.getValues();
      if (values.search) params.append("search", values.search);
      if (values.type) params.append("type", values.type);
      if (values.fromCity) params.append("fromCity", values.fromCity);
      if (values.toCity) params.append("toCity", values.toCity);
      if (values.fromDate) params.append("fromDate", values.fromDate.toISOString());
      if (values.toDate) params.append("toDate", values.toDate.toISOString());
      if (values.status) params.append("status", values.status);
      if (values.sortBy) params.append("sortBy", values.sortBy);
      if (values.sortOrder) params.append("sortOrder", values.sortOrder);
      
      // Ajouter le filtre par utilisateur
      if (userId) params.append("userId", userId);
      
      // Ajouter le filtre par statut (multiple)
      if (status && status.length > 0) {
        status.forEach(s => params.append("statusIn", s));
      }
      
      // Récupérer les annonces
      const response = await fetch(`/api/announcements?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Une erreur est survenue lors de la récupération des annonces.");
      }
      
      const data = await response.json();
      setAnnouncements(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour les paramètres de recherche
  const updateSearchParams = (values: FilterValues) => {
    startTransition(() => {
      const params = new URLSearchParams();
      
      if (values.search) params.append("search", values.search);
      if (values.type) params.append("type", values.type);
      if (values.fromCity) params.append("fromCity", values.fromCity);
      if (values.toCity) params.append("toCity", values.toCity);
      if (values.fromDate) params.append("fromDate", values.fromDate.toISOString());
      if (values.toDate) params.append("toDate", values.toDate.toISOString());
      if (values.status) params.append("status", values.status);
      if (values.sortBy) params.append("sortBy", values.sortBy);
      if (values.sortOrder) params.append("sortOrder", values.sortOrder);
      
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Soumettre le formulaire
  const onSubmit = (values: FilterValues) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      // Update search params
      Object.entries(values).forEach(([key, value]) => {
        if (value && value !== "ALL") {
          if (value instanceof Date) {
            params.set(key, value.toISOString());
          } else {
            params.set(key, value.toString());
          }
        } else {
          params.delete(key);
        }
      });
      
      // Reset page when filters change
      params.set("page", "1");
      
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    form.reset({
      search: "",
      type: "",
      fromCity: "",
      toCity: "",
      fromDate: null,
      toDate: null,
      status: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    
    setPage(1);
    router.push(pathname);
  };

  // Charger les annonces lorsque les paramètres changent
  useEffect(() => {
    fetchAnnouncements();
  }, [searchParams, page, userId, status]);

  // Changer de page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Annonces</h2>
        <div className="flex space-x-2">
          <Button 
            variant={viewMode === "list" ? "default" : "outline"} 
            onClick={() => setViewMode("list")}
          >
            Liste
          </Button>
          <Button 
            variant={viewMode === "map" ? "default" : "outline"} 
            onClick={() => setViewMode("map")}
          >
            Carte
          </Button>
          <Link href="/client/announcements/create">
            <Button>
              Nouvelle annonce
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>
            Affinez votre recherche d'annonces
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="search"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recherche</FormLabel>
                      <FormControl>
                        <Input placeholder="Mots-clés..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type d'annonce</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tous les types" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">Tous les types</SelectItem>
                          <SelectItem value="CLIENT_REQUEST">Demande client</SelectItem>
                          <SelectItem value="MERCHANT_REQUEST">Demande commerçant</SelectItem>
                          <SelectItem value="COURIER_ROUTE">Trajet proposé</SelectItem>
                          <SelectItem value="SERVICE_REQUEST">Service à la personne</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fromCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville de départ</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Paris" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="toCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville d'arrivée</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Lyon" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>À partir du</FormLabel>
                      <DatePicker
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Jusqu'au</FormLabel>
                      <DatePicker
                        selected={field.value}
                        onSelect={field.onChange}
                      />
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
                            <SelectValue placeholder="Tous les statuts" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">Tous les statuts</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="PENDING">En attente</SelectItem>
                          <SelectItem value="ASSIGNED">Attribuée</SelectItem>
                          <SelectItem value="COMPLETED">Terminée</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sortBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trier par</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Trier par" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between mt-4">
                <Button type="button" variant="outline" onClick={resetFilters}>
                  Réinitialiser
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Filtrage...
                    </>
                  ) : (
                    "Filtrer"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {total} résultat{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
          </div>
          
          {announcements.length === 0 ? (
            <Card className="p-8 text-center">
              <CardContent>
                <p className="mb-4">Aucune annonce ne correspond à vos critères.</p>
                <Button onClick={resetFilters}>Réinitialiser les filtres</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {announcements.map((announcement) => (
                  <Link href={`/client/announcements/${announcement.id}`} key={announcement.id}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-lg line-clamp-1">
                            {announcement.title}
                          </CardTitle>
                          <Badge variant={announcement.status === "ACTIVE" ? "default" : "secondary"}>
                            {statusLabels[announcement.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{typeLabels[announcement.type]}</Badge>
                          {announcement.packageType && (
                            <Badge variant="outline">{packageTypeLabels[announcement.packageType]}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pb-2">
                        <p className="text-sm line-clamp-2">{announcement.description}</p>
                        
                        <div className="flex items-center text-sm">
                          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="line-clamp-1">
                            {announcement.pickupCity} ({announcement.pickupPostalCode})
                          </span>
                          <span className="mx-1">&rarr;</span>
                          <span className="line-clamp-1">
                            {announcement.deliveryCity} ({announcement.deliveryPostalCode})
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>
                            {format(new Date(announcement.pickupDate), "dd MMM yyyy", { locale: fr })}
                            {" - "}
                            {format(new Date(announcement.deliveryDeadline), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        
                        {announcement.weight > 0 && (
                          <div className="flex items-center text-sm">
                            <Package className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span>{announcement.weight} kg</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-between items-center pt-2 pb-4">
                        <div className="flex items-center text-sm font-medium">
                          <Euro className="h-4 w-4 mr-1" />
                          {announcement.price} €
                          {announcement.isNegotiable && (
                            <span className="ml-1 text-xs text-muted-foreground">(négociable)</span>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {announcement.bids > 0 ? (
                            <span>{announcement.bids} offre{announcement.bids > 1 ? "s" : ""}</span>
                          ) : (
                            <span>Aucune offre</span>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="flex justify-center mt-8">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  
                  {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
                    .filter(p => {
                      // Afficher les premières pages, les dernières pages et les pages autour de la page actuelle
                      return p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 1;
                    })
                    .map((p, i, arr) => {
                      // Ajouter des ellipses entre les pages non adjacentes
                      const shouldShowEllipsis = i > 0 && arr[i - 1] !== p - 1;
                      
                      return (
                        <div key={p} className="flex items-center">
                          {shouldShowEllipsis && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={page === p ? "default" : "outline"}
                            className={cn(
                              "h-10 w-10",
                              page === p && "pointer-events-none"
                            )}
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                  
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === Math.ceil(total / limit)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <Card className="p-4">
          <CardContent>
            <MapView
              announcements={announcements}
              height={500}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}