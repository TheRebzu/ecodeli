"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselProps {
  images: string[];
  height?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

export function Carousel({
  images,
  height = 400,
  autoPlay = false,
  autoPlayInterval = 5000,
  className = "",
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour passer à l'image suivante
  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  }, [images.length]);

  // Fonction pour passer à l'image précédente
  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  }, [images.length]);

  // Passer à une diapositive spécifique
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Configuration de l'auto-play
  useEffect(() => {
    if (!autoPlay || images.length <= 1) return;

    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, nextSlide, images.length]);

  // S'il n'y a pas d'images, afficher un placeholder
  if (images.length === 0) {
    return (
      <div 
        className={`relative flex items-center justify-center bg-gray-200 ${className}`}
        style={{ height: `${height}px` }}
      >
        <p className="text-gray-500">Aucune image disponible</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* Image principale */}
      <div className="h-full w-full relative">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
              index === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <Image
              src={image}
              alt={`Image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: "contain" }}
              priority={index === 0}
              className={`duration-700 ${isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
              onLoad={() => setIsLoading(false)}
            />
          </div>
        ))}
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Boutons de navigation */}
      {images.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/70 hover:bg-white/90 h-8 w-8 rounded-full p-0"
            onClick={prevSlide}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/70 hover:bg-white/90 h-8 w-8 rounded-full p-0"
            onClick={nextSlide}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Indicateurs de diapositives */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-primary" : "bg-white/60"
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Diapositive ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}