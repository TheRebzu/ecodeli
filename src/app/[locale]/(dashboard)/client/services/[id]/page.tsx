import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Star, User, Timer } from "lucide-react";
import { api } from "@/trpc/server";
import { notFound } from "next/navigation";

interface ServiceDetailsPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string; locale: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Récupérer les détails du service pour le titre
    const service = await api.service.getServiceById.query({ id });
    
    return {
      title: `${service?.name || 'Service'} | EcoDeli`,
      description: service?.description || "Détails du service",
    };
  } catch (error) {
    return {
      title: "Service non trouvé | EcoDeli",
      description: "Ce service n'existe pas ou a été supprimé",
    };
  }
}

export default async function ServiceDetailsPage({
  params,
}: ServiceDetailsPageProps) {
  const { id, locale } = await params;
  
  try {
    // Récupérer les données du service via TRPC
    const service = await api.service.getServiceById.query({ id });
    const provider = await api.user.getProviderById.query({ id: service.providerId });
    const reviews = await api.service.getServiceReviews.query({ serviceId: id });
    
    // Calculer la note moyenne
    const averageRating = reviews.length 
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;
    
    return (
      <div className="container py-8">
        <div className="mb-8">
          <Link href={`/${locale}/client/services`}>
            <Button variant="ghost" className="flex items-center gap-2 p-0">
              <ArrowLeft className="h-4 w-4" />
              Retour aux services
            </Button>
          </Link>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{service.name}</h1>
              
              <div className="flex items-center gap-4 mt-2">
                <Badge className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {averageRating.toFixed(1)} ({reviews.length} avis)
                </Badge>
                
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {service.location}
                </span>
                
                <span className="text-muted-foreground flex items-center gap-1">
                  <Timer className="h-4 w-4" />
                  {service.duration} min
                </span>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground">{service.description}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Avis clients</h2>
              
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-medium">{review.userName}</span>
                            </div>
                            <div className="flex items-center mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating 
                                      ? "text-yellow-400 fill-yellow-400" 
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Aucun avis pour le moment.
                </p>
              )}
            </div>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Réserver ce service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">{service.price.toFixed(2)} €</p>
                  <p className="text-sm text-muted-foreground">
                    {service.priceType === "HOUR" ? "par heure" : "forfait"}
                  </p>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Prestataire</h3>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {provider.isVerified ? "Vérifié" : "Non vérifié"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Disponibilité</h3>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4" />
                    <p>Prochaine disponibilité: {service.nextAvailability}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm mt-1">
                    <Clock className="h-4 w-4" />
                    <p>Durée: {service.duration} minutes</p>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={() => api.booking.createBooking.mutate({ serviceId: id })}
                >
                  Réserver maintenant
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
