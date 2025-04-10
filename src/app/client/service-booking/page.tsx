'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureTutorial } from "@/components/client/tutorial/feature-tutorial";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Clock, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

// Types
interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  location: string;
  provider: {
    id: string;
    name: string;
    rating: number;
  };
  availability: string[];
}

// Étapes du tutoriel pour la réservation de services
const SERVICE_BOOKING_TUTORIAL_STEPS = [
  {
    id: "service-search",
    title: "Rechercher un service",
    description: "Utilisez les filtres pour trouver le service qui correspond à vos besoins.",
    targetElementId: "service-search-filters",
    position: "bottom" as const
  },
  {
    id: "service-calendar",
    title: "Sélectionner une date",
    description: "Choisissez la date et l'heure qui vous conviennent dans le calendrier interactif.",
    targetElementId: "booking-calendar",
    position: "left" as const
  },
  {
    id: "service-payment",
    title: "Paiement sécurisé",
    description: "Effectuez votre paiement en toute sécurité avec notre système intégré Stripe.",
    targetElementId: "payment-section",
    position: "right" as const
  }
]

export default function ServiceBookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Récupérer la liste des services disponibles
  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/client/services');
      
      if (!response.ok) {
        throw new Error('Impossible de récupérer les services disponibles');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Une erreur est survenue');
      }
      
      setServices(data.data);
      setFilteredServices(data.data);
      
      // Extraire les catégories uniques
      const uniqueCategories = Array.from(
        new Set(data.data.map((service: Service) => service.category))
      ) as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Erreur lors de la récupération des services:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les services disponibles. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filtrer les services selon la catégorie et la recherche
  useEffect(() => {
    if (!services.length) return;
    
    let filtered = [...services];
    
    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }
    
    // Filtrer par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(query) || 
        service.description.toLowerCase().includes(query) ||
        service.location.toLowerCase().includes(query)
      );
    }
    
    setFilteredServices(filtered);
  }, [selectedCategory, searchQuery, services]);
  
  // Charger les données au chargement du composant
  useEffect(() => {
    fetchServices();
  }, []);
  
  // Formatter le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Réservation de services</h1>
          <p className="text-gray-500">Trouvez et réservez des services à domicile en quelques clics</p>
        </div>
      </div>
      
      {/* Filtres de recherche */}
      <div id="service-search-filters" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              type="search"
              placeholder="Rechercher un service..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs 
            value={selectedCategory} 
            onValueChange={setSelectedCategory} 
            className="w-full sm:w-auto"
          >
            <TabsList className="w-full">
              <TabsTrigger value="all">Tous</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Liste des services */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchServices}>Réessayer</Button>
          </CardContent>
        </Card>
      ) : filteredServices.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">Aucun service ne correspond à votre recherche</p>
            <Button onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}>Réinitialiser les filtres</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                <CardDescription>{service.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{service.description}</p>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{service.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Disponible {service.availability.length} créneaux</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="font-bold text-lg">{formatPrice(service.price)}</span>
                  <Button variant="outline" size="sm" id="booking-calendar">
                    Réserver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Section de paiement (visible après sélection d'un service) */}
      <div id="payment-section" className="hidden">
        <Card>
          <CardHeader>
            <CardTitle>Paiement</CardTitle>
            <CardDescription>Finalisez votre réservation en toute sécurité</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Intégration de paiement à venir</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Intégrer le tutoriel pour la réservation de services */}
      <FeatureTutorial 
        featureId="service-booking" 
        steps={SERVICE_BOOKING_TUTORIAL_STEPS} 
      />
    </div>
  );
}

