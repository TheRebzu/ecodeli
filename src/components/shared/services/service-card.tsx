"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarIcon, MapPinIcon, ClockIcon, EuroIcon } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/i18n/formatters";
import { useRouter } from "next/navigation";

import { type ServiceCardProps } from "@/types/client/services";

/**
 * Carte de présentation d'un service
 */
export function ServiceCard({ service, onBook, onViewDetails }: ServiceCardProps) {
  const t = useTranslations("services");
  const router = useRouter();

  const { id, name, description, price, duration, category, provider } = service;

  // Troncature de la description si trop longue
  const truncatedDescription =
    description.length > 120
      ? `${description.substring(0, 120)}...`
      : description;

  // Génération des étoiles pour la notation
  const renderRating = () => {
    if (!provider.rating) return null;

    const stars = [];
    const rating = Math.round(provider.rating);

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <StarIcon
          key={i}
          className={`h-4 w-4 ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        />,
      );
    }

    return (
      <div className="flex items-center space-x-1">
        <div className="flex">{stars}</div>
        <span className="text-sm text-gray-600">
          ({ provider.rating.toFixed(1) })
        </span>
      </div>
    );
  };

  // Navigation vers la page de détail du service
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(service);
    } else {
      router.push(`/client/services/${id}`);
    }
  };

  const handleBookService = () => {
    if (onBook) {
      onBook(service);
    } else {
      router.push(`/client/services/${id}/book`);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{name}</CardTitle>
          <Badge variant="outline" className="bg-primary/10">
            {category.name}
          </Badge>
        </div>
        <CardDescription className="flex items-center text-sm text-gray-500">
          <span className="font-medium">{provider.name}</span>
          {renderRating()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-gray-600 mb-4">{truncatedDescription}</p>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <ClockIcon className="w-4 h-4" />
            <span>{formatDuration(duration)}</span>
          </div>

          {provider.providerAddress && (
            <div className="flex items-center gap-1 text-gray-600">
              <MapPinIcon className="w-4 h-4" />
              <span className="truncate" title={provider.providerAddress}>
                {provider.providerAddress.split(",")[0]}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 font-medium text-primary col-span-2">
            <EuroIcon className="w-4 h-4" />
            <span>{formatPrice(price)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1">
        <Button onClick={handleViewDetails} className="w-full">
          {t("card.viewDetails")}
        </Button>
      </CardFooter>
    </Card>
  );
}
