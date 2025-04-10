'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureTutorial } from "@/components/client/tutorial/feature-tutorial";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Types
interface StorageBox {
  id: string;
  name: string;
  description: string;
  size: string;
  pricePerDay: number;
  availability: boolean;
  location: string;
  features: string[];
}

// Étapes du tutoriel pour la réservation de box
const STORAGE_BOX_TUTORIAL_STEPS = [
  {
    id: "storage-box-create",
    title: "Réserver une box",
    description: "Cliquez ici pour réserver une nouvelle box de stockage temporaire.",
    targetElementId: "reserve-box-btn",
    position: "bottom" as const
  },
  {
    id: "storage-box-availability",
    title: "Consulter la disponibilité",
    description: "Vérifiez la disponibilité des box pour les dates qui vous intéressent.",
    targetElementId: "box-availability-calendar",
    position: "right" as const
  },
  {
    id: "storage-box-details",
    title: "Détails de la box",
    description: "Consultez les caractéristiques et dimensions de chaque type de box.",
    targetElementId: "box-details",
    position: "left" as const
  }
]

export default function StorageBoxPage() {
  const [boxes, setBoxes] = useState<StorageBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Récupérer la liste des boxes de stockage
  const fetchStorageBoxes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/client/storage-boxes');
      
      if (!response.ok) {
        throw new Error('Impossible de récupérer les boxes de stockage');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Une erreur est survenue');
      }
      
      setBoxes(data.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des boxes:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les boxes de stockage. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Charger les données au chargement du composant
  useEffect(() => {
    fetchStorageBoxes();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Box de stockage</h1>
          <p className="text-gray-500">Stockez vos affaires en toute sécurité pour la durée de votre choix</p>
        </div>
        <Button id="reserve-box-btn" variant="default">Réserver une box</Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
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
            <Button onClick={fetchStorageBoxes}>Réessayer</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boxes.map((box) => (
            <Card key={box.id} id="box-details">
              <CardHeader>
                <CardTitle>{box.name}</CardTitle>
                <CardDescription>{box.size} - {box.pricePerDay}€/jour</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-4">{box.description}</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Caractéristiques:</p>
                  <ul className="text-sm space-y-1">
                    {box.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div id="box-availability-calendar" className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Disponibilité des box</CardTitle>
            <CardDescription>Consultez les disponibilités pour les dates souhaitées</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Calendrier des disponibilités à implémenter</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Intégrer le tutoriel pour les box de stockage */}
      <FeatureTutorial 
        featureId="storage-box" 
        steps={STORAGE_BOX_TUTORIAL_STEPS} 
      />
    </div>
  );
}

