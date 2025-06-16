"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Filter, RefreshCw, AlertCircle, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import { toast } from "sonner";
import { useDelivererAnnouncements } from "@/hooks/delivery/use-announcement";
import AnnouncementList from "@/components/client/announcements/announcement-list";

export default function DelivererAnnouncementsPage() {
  useRoleProtection(["DELIVERER"]);
  const t = useTranslations("announcements");
  const [activeTab, setActiveTab] = useState("available");
  const [showFilters, setShowFilters] = useState(false);
  const [radius, setRadius] = useState(10);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const {
    availableAnnouncements,
    myApplications,
    isLoading,
    isLoadingApplications,
    error,
    fetchAvailableAnnouncements,
    fetchMyApplications,
    filterByProximity} = useDelivererAnnouncements({
    initialFilter: {
      limit: 20,
      page: 1}});

  // Charger les annonces selon l'onglet actif
  useEffect(() => {
    if (activeTab === "available") {
      fetchAvailableAnnouncements(1);
    } else if (activeTab === "applications") {
      fetchMyApplications();
    }
  }, [activeTab, fetchAvailableAnnouncements, fetchMyApplications]);

  // Rechercher les annonces à proximité
  const handleProximitySearch = () => {
    setIsLoadingLocation(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          filterByProximity(latitude, longitude, radius)
            .then(() => {
              toast.success(t("proximitySearchSuccess"));
            })
            .catch((err) => {
              toast.error(t("proximitySearchError"));
              console.error(err);
            })
            .finally(() => {
              setIsLoadingLocation(false);
            });
        },
        (err) => {
          console.error("Erreur de géolocalisation:", err);
          toast.error(t("locationError"));
          setIsLoadingLocation(false);
        },
      );
    } else {
      toast.error(t("geolocationNotSupported"));
      setIsLoadingLocation(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("availableAnnouncements")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("findDeliveryOpportunities")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t("filter")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={
              activeTab === "available"
                ? fetchAvailableAnnouncements
                : fetchMyApplications
            }
            disabled={isLoading || isLoadingApplications}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading || isLoadingApplications ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Filtres de proximité */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>{t("proximitySearch")}</CardTitle>
            <CardDescription>{t("findAnnouncementsNearby")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">
                    {t("searchRadius")}: {radius} km
                  </label>
                  <Slider
                    value={[radius]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={(value) => setRadius(value[0])}
                  />
                </div>
                <Button
                  onClick={handleProximitySearch}
                  disabled={isLoadingLocation}
                  className="w-full md:w-auto"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {isLoadingLocation
                    ? t("searchingLocation")
                    : t("searchNearMe")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        defaultValue="available"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="available">
            {t("availableAnnouncements")}
          </TabsTrigger>
          <TabsTrigger value="applications">{t("myApplications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {isLoading ? (
            
            <div className="space-y-4">
              {Array.from({ length: 3  }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
              ))}
            </div>
          ) : availableAnnouncements.length === 0 ? (
            // Message quand il n'y a pas d'annonces
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-medium">
                {t("noAvailableAnnouncements")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("checkBackLater")}
              </p>
              <Button
                variant="outline"
                onClick={handleProximitySearch}
                className="mt-4"
                disabled={isLoadingLocation}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {t("searchNearby")}
              </Button>
            </div>
          ) : (
            // Liste des annonces
            <AnnouncementList
              announcements={availableAnnouncements}
              displayMode="card"
              onPageChange={fetchAvailableAnnouncements}
              viewType="deliverer"
            />
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {isLoadingApplications ? (
            
            <div className="space-y-4">
              {Array.from({ length: 3  }).map((_, i) => (
                <Skeleton key={i} className="h-[200px] w-full rounded-lg" />
              ))}
            </div>
          ) : myApplications.length === 0 ? (
            // Message quand il n'y a pas de candidatures
            <div className="text-center py-12 bg-muted/50 rounded-lg">
              <h3 className="text-lg font-medium">{t("noApplications")}</h3>
              <p className="text-muted-foreground mt-2">
                {t("applyToAnnouncements")}
              </p>
              <Button
                variant="outline"
                onClick={() => setActiveTab("available")}
                className="mt-4"
              >
                <Search className="mr-2 h-4 w-4" />
                {t("browseAnnouncements")}
              </Button>
            </div>
          ) : (
            // Liste des candidatures
            <AnnouncementList
              announcements={myApplications}
              displayMode="card"
              onPageChange={() => fetchMyApplications()}
              viewType="applications"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
