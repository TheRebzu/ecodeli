import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnnouncementStatus, PackageSize } from "@prisma/client";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Package, 
  Filter,
  X,
  Clock,
  History,
  Loader2
} from "lucide-react";

import { AnnouncementsList } from "@/components/announcements/announcements-list";

export function AdvancedSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get("locale") || "fr";
  const dateLocale = locale === "fr" ? fr : enUS;
  
  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [status, setStatus] = useState<AnnouncementStatus | "">("");
  const [packageSize, setPackageSize] = useState<PackageSize | "">("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [weightRange, setWeightRange] = useState<[number, number]>([0, 50]);
  const [requiresInsurance, setRequiresInsurance] = useState<boolean | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [radius, setRadius] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // État pour les suggestions de recherche
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Récupérer les suggestions de recherche
  const { data: suggestionsData } = api.search.getSearchSuggestions.useQuery(
    { prefix: searchTerm, limit: 5 },
    {
      enabled: searchTerm.length >= 2 && showSuggestions,
      refetchOnWindowFocus: false,
    }
  );
  
  // Récupérer les statistiques de recherche de l'utilisateur
  const { data: searchStats } = api.search.getUserSearchStats.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );
  
  // Mutation pour enregistrer un terme de recherche
  const saveSearchTerm = api.search.saveSearchTerm.useMutation();
  
  // Effectuer la recherche
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage } = 
    api.search.searchAnnouncements.useInfiniteQuery(
      {
        searchTerm: searchTerm || undefined,
        status: status as AnnouncementStatus | undefined,
        packageSize: packageSize as PackageSize | undefined,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        minWeight: weightRange[0],
        maxWeight: weightRange[1],
        requiresInsurance,
        fromDate,
        toDate,
        location,
        radius: location ? radius : undefined,
        sortBy: sortBy as any,
        sortOrder,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
        enabled: !isSearching,
      }
    );
  
  // Géolocalisation de l'utilisateur
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success(t("locationDetected"));
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          toast.error(t("locationError"));
        }
      );
    } else {
      toast.error(t("geolocationNotSupported"));
    }
  };
  
  // Réinitialiser la localisation
  const resetLocation = () => {
    setLocation(undefined);
    setRadius(10);
  };
  
  // Gérer la soumission de la recherche
  const handleSearch = () => {
    setIsSearching(true);
    
    // Enregistrer le terme de recherche s'il existe
    if (searchTerm.trim()) {
      saveSearchTerm.mutate({ searchTerm: searchTerm.trim() });
    }
    
    // Simuler un délai de recherche
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };
  
  // Réinitialiser tous les filtres
  const resetFilters = () => {
    setSearchTerm("");
    setStatus("");
    setPackageSize("");
    setPriceRange([0, 1000]);
    setWeightRange([0, 50]);
    setRequiresInsurance(undefined);
    setFromDate(undefined);
    setToDate(undefined);
    setLocation(undefined);
    setRadius(10);
    setSortBy("createdAt");
    setSortOrder("desc");
  };
  
  // Utiliser un terme de recherche suggéré
  const useSearchSuggestion = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };
  
  // Compter le nombre de filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (status) count++;
    if (packageSize) count++;
    if (priceRange[0] > 0 || priceRange[1] < 1000) count++;
    if (weightRange[0] > 0 || weightRange[1] < 50) count++;
    if (requiresInsurance !== undefined) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (location) count++;
    return count;
  };
  
  // Récupérer toutes les annonces de toutes les pages
  const announcements = data?.pages.flatMap((page) => page.announcements) || [];
  
  return (
    <div className="space-y-6">
      {/* Barre de recherche principale */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              className="pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.length >= 2) {
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (searchTerm.length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Délai pour permettre de cliquer sur une suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowSuggestions(false);
                  handleSearch();
                }
              }}
            />
            {searchTerm && (
              <button
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {t("search")}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {t("filters")}
                {getActiveFiltersCount() > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">{t("status")}</h4>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as AnnouncementStatus | "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("allStatuses")}</SelectItem>
                      <SelectItem value={AnnouncementStatus.OPEN}>{t("status.open")}</SelectItem>
                      <SelectItem value={AnnouncementStatus.ASSIGNED}>{t("status.assigned")}</SelectItem>
                      <SelectItem value={AnnouncementStatus.IN_TRANSIT}>{t("status.in_transit")}</SelectItem>
                      <SelectItem value={AnnouncementStatus.DELIVERED}>{t("status.delivered")}</SelectItem>
                      <SelectItem value={AnnouncementStatus.CANCELLED}>{t("status.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">{t("packageSize")}</h4>
                  <Select
                    value={packageSize}
                    onValueChange={(value) => setPackageSize(value as PackageSize | "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("allSizes")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("allSizes")}</SelectItem>
                      <SelectItem value={PackageSize.SMALL}>{t("size.small")}</SelectItem>
                      <SelectItem value={PackageSize.MEDIUM}>{t("size.medium")}</SelectItem>
                      <SelectItem value={PackageSize.LARGE}>{t("size.large")}</SelectItem>
                      <SelectItem value={PackageSize.EXTRA_LARGE}>{t("size.extra_large")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{t("priceRange")}</h4>
                    <span className="text-sm text-gray-500">
                      {priceRange[0]}€ - {priceRange[1]}€
                    </span>
                  </div>
                  <Slider
                    value={priceRange}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={(values) => setPriceRange(values as [number, number])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{t("weightRange")}</h4>
                    <span className="text-sm text-gray-500">
                      {weightRange[0]} kg - {weightRange[1]} kg
                    </span>
                  </div>
                  <Slider
                    value={weightRange}
                    min={0}
                    max={50}
                    step={1}
                    onValueChange={(values) => setWeightRange(values as [number, number])}
                  />
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">{t("insurance")}</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance"
                      checked={requiresInsurance === true}
                      onCheckedChange={(checked) => {
                        if (checked === "indeterminate") {
                          setRequiresInsurance(undefined);
                        } else {
                          setRequiresInsurance(checked || undefined);
                        }
                      }}
                    />
                    <label
                      htmlFor="insurance"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("requiresInsurance")}
                    </label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">{t("dateRange")}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t("fromDate")}</p>
                      <DatePicker
                        date={fromDate}
                        setDate={setFromDate}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t("toDate")}</p>
                      <DatePicker
                        date={toDate}
                        setDate={setToDate}
                        disabled={(date) => fromDate ? date < fromDate : false}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">{t("location")}</h4>
                  {location ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm">
                            {t("locationDetected")}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetLocation}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">{t("searchRadius")}</span>
                          <span className="text-sm font-medium">{radius} km</span>
                        </div>
                        <Slider
                          value={[radius]}
                          min={1}
                          max={50}
                          step={1}
                          onValueChange={(values) => setRadius(values[0])}
                        />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={getUserLocation}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {t("useMyLocation")}
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">{t("sorting")}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={sortBy}
                      onValueChange={setSortBy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("sortBy")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">{t("sortByDate")}</SelectItem>
                        <SelectItem value="price">{t("sortByPrice")}</SelectItem>
                        <SelectItem value="deadline">{t("sortByDeadline")}</SelectItem>
                        {location && (
                          <SelectItem value="distance">{t("sortByDistance")}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Select
                      value={sortOrder}
                      onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("sortOrder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">{t("ascending")}</SelectItem>
                        <SelectItem value="desc">{t("descending")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                  >
                    {t("resetFilters")}
                  </Button>
                  <Button onClick={handleSearch}>
                    {t("applyFilters")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Suggestions de recherche */}
        {showSuggestions && suggestionsData?.suggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white rounded-md shadow-lg mt-1 border">
            <ul className="py-1">
              {suggestionsData.suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => useSearchSuggestion(suggestion)}
                >
                  <Search className="h-4 w-4 text-gray-400 mr-2" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Historique de recherche */}
      {searchStats && (searchStats.recentSearches.length > 0 || searchStats.frequentSearches.length > 0) && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="search-history">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                {t("searchHistory")}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchStats.recentSearches.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {t("recentSearches")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {searchStats.recentSearches.map((term, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => useSearchSuggestion(term)}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchStats.frequentSearches.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">{t("frequentSearches")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {searchStats.frequentSearches.map((item, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => useSearchSuggestion(item.term)}
                        >
                          {item.term} ({item.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      
      {/* Filtres actifs */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">{t("activeFilters")}:</span>
          
          {status && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("status.label")}: {t(`status.${status.toLowerCase()}`)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setStatus("")}
              />
            </Badge>
          )}
          
          {packageSize && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("packageSize")}: {t(`size.${packageSize.toLowerCase()}`)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setPackageSize("")}
              />
            </Badge>
          )}
          
          {(priceRange[0] > 0 || priceRange[1] < 1000) && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("price")}: {priceRange[0]}€ - {priceRange[1]}€
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setPriceRange([0, 1000])}
              />
            </Badge>
          )}
          
          {(weightRange[0] > 0 || weightRange[1] < 50) && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("weight")}: {weightRange[0]} kg - {weightRange[1]} kg
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setWeightRange([0, 50])}
              />
            </Badge>
          )}
          
          {requiresInsurance !== undefined && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {requiresInsurance ? t("insured") : t("notInsured")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setRequiresInsurance(undefined)}
              />
            </Badge>
          )}
          
          {fromDate && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("from")}: {format(fromDate, "P", { locale: dateLocale })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFromDate(undefined)}
              />
            </Badge>
          )}
          
          {toDate && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("to")}: {format(toDate, "P", { locale: dateLocale })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setToDate(undefined)}
              />
            </Badge>
          )}
          
          {location && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1"
            >
              {t("nearMe")}: {radius} km
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={resetLocation}
              />
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
          >
            {t("clearAll")}
          </Button>
        </div>
      )}
      
      {/* Résultats de recherche */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-medium">{t("noResults")}</p>
            <p className="text-gray-500 mt-2">{t("tryDifferentSearch")}</p>
          </Card>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">
                {announcements.length} {t("resultsFound")}
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Utiliser le composant AnnouncementsList pour afficher les résultats */}
              <AnnouncementsList announcements={announcements} />
              
              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetching}
                    variant="outline"
                  >
                    {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("loadMore")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
