"use client";

import { Star, StarHalf } from "lucide-react";

interface UserRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}

export function UserRating({ rating, size = "sm", showNumber = true }: UserRatingProps) {
  // Arrondir à 0.5 près
  const roundedRating = Math.round(rating * 2) / 2;
  
  // Nombre d'étoiles pleines
  const fullStars = Math.floor(roundedRating);
  
  // S'il y a une demi-étoile
  const hasHalfStar = roundedRating % 1 !== 0;
  
  // Nombre d'étoiles vides
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  // Classes CSS selon la taille
  const starSizeClass = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];
  
  // Classe CSS pour l'espacement
  const spacingClass = {
    sm: "mr-0.5",
    md: "mr-1",
    lg: "mr-1.5",
  }[size];
  
  return (
    <div className="flex items-center">
      <div className="flex items-center text-yellow-500">
        {/* Étoiles pleines */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`${starSizeClass} ${i < 4 ? spacingClass : ""} fill-current`}
          />
        ))}
        
        {/* Demi-étoile si nécessaire */}
        {hasHalfStar && (
          <StarHalf
            className={`${starSizeClass} ${fullStars < 4 ? spacingClass : ""} fill-current`}
          />
        )}
        
        {/* Étoiles vides */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`${starSizeClass} ${
              i < emptyStars - 1 ? spacingClass : ""
            } text-gray-300`}
          />
        ))}
      </div>
      
      {showNumber && (
        <span className="ml-1.5 text-xs text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}