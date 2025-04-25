import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Filter, Star, Clock } from "lucide-react";
import { api } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Services disponibles",
  description: "Explorez tous les services disponibles sur EcoDeli",
};

interface ServicesPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ServicesPage({
  params,
  searchParams,
}: ServicesPageProps) {
  const { locale } = await params;
  const searchParamsData = await searchParams;
  
  // Extraire les paramètres de recherche
  const query = searchParamsData?.query as string || "";
  const category = searchParamsData?.category as string || "";
  const sort = searchParamsData?.sort as string || "popularity";
  
  // Récupérer les services via TRPC avec filtrage
  const services = await api.service.getServices.query({
    query,
    category,
    sort,
    limit: 20
  });
  
  // Récupérer les catégories disponibles
  const categories = await api.service.getServiceCategories.query();

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Services disponibles</h1>
          <p className="text-muted-foreground mt-2">
            Explorez tous les services disponibles pour vos besoins de livraison et d&apos;entreposage
          </p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un service..."
            className="pl-10"
            defaultValue={query}
          />
        </div>
        
        <Select defaultValue={category || "all"}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select defaultValue={sort}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popularity">Popularité</SelectItem>
            <SelectItem value="price_low">Prix croissant</SelectItem>
            <SelectItem value="price_high">Prix décroissant</SelectItem>
            <SelectItem value="rating">Note</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtres avancés
        </Button>
      </div>
      
      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link key={service.id} href={`/${locale}/client/services/${service.id}`}>
              <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <Badge>{service.category.name}</Badge>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{service.location}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2">{service.description}</p>
                  
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />
                      <span>{service.averageRating.toFixed(1)} ({service.reviewCount})</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{service.duration} min</span>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between border-t pt-4">
                  <p className="font-medium text-lg">{service.price.toFixed(2)} €</p>
                  <Button size="sm">Voir détails</Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-xl font-medium mb-2">Aucun service trouvé</p>
          <p className="text-muted-foreground">
            Essayez de modifier vos critères de recherche
          </p>
        </div>
      )}
    </div>
  );
}
