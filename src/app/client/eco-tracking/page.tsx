'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeatureTutorial } from "@/components/client/tutorial/feature-tutorial";

// Étapes du tutoriel pour le suivi des colis en temps réel
const TRACKING_TUTORIAL_STEPS = [
  {
    id: "tracking-map",
    title: "Carte interactive",
    description: "Suivez vos colis en temps réel sur cette carte interactive.",
    targetElementId: "tracking-map",
    position: "bottom" as const
  },
  {
    id: "tracking-details",
    title: "Détails de la livraison",
    description: "Consultez les détails et l'historique de votre livraison.",
    targetElementId: "tracking-details",
    position: "right" as const
  },
  {
    id: "tracking-notifications",
    title: "Notifications en temps réel",
    description: "Activez les notifications pour être informé à chaque étape de la livraison.",
    targetElementId: "notification-settings",
    position: "top" as const
  }
]

export default function EcoTrackingPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Titre de la page</CardTitle>
          <CardDescription>Description de la page</CardDescription>
        </CardHeader>
        <CardContent>
          <h1>Suivi de colis en temps réel</h1>
          
          {/* Intégrer le tutoriel pour le suivi des colis */}
          <FeatureTutorial 
            featureId="eco-tracking" 
            steps={TRACKING_TUTORIAL_STEPS} 
          />
          
          <p>Contenu de la page</p>
        </CardContent>
      </Card>
    </div>
  );
}

