'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TodoMarkerProps {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Composant TodoMarker qui affiche un élément visuel pour indiquer du travail à terminer
 * Ce composant est utile pendant le développement pour marquer les fonctionnalités inachevées
 */
export function TodoMarker({
  title = 'À implémenter',
  description = 'Cette fonctionnalité est en cours de développement et sera disponible prochainement.',
  priority = 'medium',
}: TodoMarkerProps) {
  // Couleurs basées sur la priorité
  const colors = {
    low: 'bg-blue-50 text-blue-800 border-blue-200',
    medium: 'bg-amber-50 text-amber-800 border-amber-200',
    high: 'bg-red-50 text-red-800 border-red-200',
  };

  const colorClass = colors[priority];

  return (
    <Alert className={`border ${colorClass}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
