'use client';

import { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  showCount?: boolean;
  reviewCount?: number;
  precision?: 'full' | 'half';
  className?: string;
}

/**
 * Composant d'affichage et de sélection de notation par étoiles
 * Supporte la notation en demi-étoiles et différentes tailles
 */
export function RatingStars({
  rating,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
  showCount = false,
  reviewCount,
  precision = 'full',
  className,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);

  // Configuration des tailles
  const sizeConfig = {
    sm: { star: 'h-3 w-3', text: 'text-xs', gap: 'gap-0.5' },
    md: { star: 'h-4 w-4', text: 'text-sm', gap: 'gap-1' },
    lg: { star: 'h-5 w-5', text: 'text-base', gap: 'gap-1' },
    xl: { star: 'h-6 w-6', text: 'text-lg', gap: 'gap-1.5' },
  };

  const config = sizeConfig[size];

  // Gestionnaire de clic sur une étoile
  const handleStarClick = (starRating: number) => {
    if (readonly || !onChange) return;
    onChange(starRating);
  };

  // Gestionnaire de survol
  const handleStarHover = (starRating: number) => {
    if (readonly) return;
    setHoverRating(starRating);
  };

  // Réinitialiser le survol
  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  // Déterminer le niveau de remplissage d'une étoile
  const getStarFill = (starIndex: number) => {
    const currentRating = hoverRating || rating;
    const starValue = starIndex + 1;

    if (currentRating >= starValue) {
      return 'full';
    } else if (precision === 'half' && currentRating >= starValue - 0.5) {
      return 'half';
    }
    return 'empty';
  };

  // Obtenir la couleur selon la note
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 4.0) return 'text-blue-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 3.0) return 'text-orange-500';
    return 'text-red-500';
  };

  // Obtenir le label textuel
  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4.0) return 'Très bien';
    if (rating >= 3.5) return 'Bien';
    if (rating >= 3.0) return 'Correct';
    if (rating > 0) return 'Insuffisant';
    return 'Non noté';
  };

  // Rendu d'une étoile individuelle
  const renderStar = (index: number) => {
    const fill = getStarFill(index);
    const starValue = index + 1;

    return (
      <button
        key={index}
        type="button"
        className={cn(
          'relative transition-transform',
          !readonly && 'hover:scale-110 cursor-pointer',
          readonly && 'cursor-default'
        )}
        onClick={() => handleStarClick(starValue)}
        onMouseEnter={() => handleStarHover(starValue)}
        disabled={readonly}
        aria-label={`${starValue} étoile${starValue > 1 ? 's' : ''}`}
      >
        {fill === 'half' ? (
          <div className="relative">
            <Star className={cn(config.star, 'text-gray-300')} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={cn(config.star, 'text-yellow-400 fill-yellow-400')} />
            </div>
          </div>
        ) : (
          <Star
            className={cn(
              config.star,
              fill === 'full'
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300',
              'transition-colors'
            )}
          />
        )}
      </button>
    );
  };

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      {/* Étoiles */}
      <div
        className={cn('flex items-center', config.gap)}
        onMouseLeave={handleMouseLeave}
      >
        {Array.from({ length: 5 }, (_, index) => renderStar(index))}
      </div>

      {/* Valeur numérique */}
      {showValue && (
        <span className={cn('font-medium', config.text, getRatingColor(rating))}>
          {rating > 0 ? rating.toFixed(1) : '—'}
        </span>
      )}

      {/* Nombre d'avis */}
      {showCount && reviewCount !== undefined && (
        <span className={cn('text-muted-foreground', config.text)}>
          ({reviewCount})
        </span>
      )}

      {/* Label textuel (optionnel pour les grandes tailles) */}
      {size === 'lg' || size === 'xl' ? (
        <span className={cn('text-muted-foreground', config.text)}>
          {getRatingLabel(rating)}
        </span>
      ) : null}
    </div>
  );
}
