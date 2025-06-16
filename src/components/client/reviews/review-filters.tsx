"use client";

import React from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Icons
import { Search, Filter, RotateCcw, Star } from "lucide-react";

interface ReviewFiltersProps {
  ratingFilter: string;
  typeFilter: string;
  verifiedFilter: boolean;
  searchQuery: string;
  onRatingChange: (rating: string) => void;
  onTypeChange: (type: string) => void;
  onVerifiedChange: (verified: boolean) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export function ReviewFilters({
  ratingFilter,
  typeFilter,
  verifiedFilter,
  searchQuery,
  onRatingChange,
  onTypeChange,
  onVerifiedChange,
  onSearchChange,
  onReset}: ReviewFiltersProps) {
  const t = useTranslations("reviews");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {t("filters")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("rating")}</label>
            <Select value={ratingFilter} onValueChange={onRatingChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allRatings")}</SelectItem>
                <SelectItem value="5">
                  {t("ratingStars", { stars: 5 })}
                </SelectItem>
                <SelectItem value="4">
                  {t("ratingStars", { stars: 4 })}
                </SelectItem>
                <SelectItem value="3">
                  {t("ratingStars", { stars: 3 })}
                </SelectItem>
                <SelectItem value="2">
                  {t("ratingStars", { stars: 2 })}
                </SelectItem>
                <SelectItem value="1">
                  {t("ratingStars", { stars: 1 })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("type")}</label>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                <SelectItem value="service">{t("serviceReviews")}</SelectItem>
                <SelectItem value="delivery">{t("deliveryReviews")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cases à cocher */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={verifiedFilter}
                onCheckedChange={onVerifiedChange}
              />
              <label htmlFor="verified" className="text-sm font-medium">
                {t("onlyVerified")}
              </label>
            </div>
          </div>
        </div>

        {/* Aperçu rapide des notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {t("quickFilter")}
          </label>
          <div className="flex gap-2 flex-wrap">
            {[5, 4, 3, 2, 1].map((rating) => (
              <Button
                key={rating}
                variant={
                  ratingFilter === rating.toString() ? "default" : "outline"
                }
                size="sm"
                onClick={() => onRatingChange(rating.toString())}
                className="flex items-center gap-1"
              >
                <span>{rating}</span>
                <Star className="h-3 w-3 fill-current" />
              </Button>
            ))}
          </div>
        </div>

        {/* Bouton de réinitialisation */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("resetFilters")}
        </Button>
      </CardContent>
    </Card>
  );
}
