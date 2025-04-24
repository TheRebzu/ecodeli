import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { AnnouncementStatus, PackageSize } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistance } from "date-fns";
import { fr, enUS } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter, 
  ArrowUpDown,
  Loader2
} from "lucide-react";

export function AnnouncementsList() {
  const t = useTranslations("announcements");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = searchParams.get("locale") || "fr";
  const dateLocale = locale === "fr" ? fr : enUS;

  // États pour les filtres
  const [status, setStatus] = useState<AnnouncementStatus | "">("");
  const [packageSize, setPackageSize] = useState<PackageSize | "">("");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // État pour la pagination
  const [cursor, setCursor] = useState<string | null>(null);

  // Requête pour récupérer les annonces
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage } = 
    api.announcement.getAll.useInfiniteQuery(
      {
        status: status as AnnouncementStatus | undefined,
        packageSize: packageSize as PackageSize | undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        searchTerm: searchTerm || undefined,
        limit: 10,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        keepPreviousData: true,
      }
    );

  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    setCursor(null);
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setStatus("");
    setPackageSize("");
    setMinPrice(0);
    setMaxPrice(1000);
    setSearchTerm("");
    setCursor(null);
  };

  // Fonction pour naviguer vers le détail d'une annonce
  const goToAnnouncementDetail = (id: string) => {
    router.push(`/announcements/${id}`);
  };

  // Fonction pour afficher le statut d'une annonce
  const renderStatusBadge = (status: AnnouncementStatus) => {
    const statusColors = {
      [AnnouncementStatus.OPEN]: "bg-green-500",
      [AnnouncementStatus.ASSIGNED]: "bg-blue-500",
      [AnnouncementStatus.IN_TRANSIT]: "bg-yellow-500",
      [AnnouncementStatus.DELIVERED]: "bg-purple-500",
      [AnnouncementStatus.CANCELLED]: "bg-red-500",
    };

    return (
      <Badge className={`${statusColors[status]}`}>
        {t(`status.${status.toLowerCase()}`)}
      </Badge>
    );
  };

  // Fonction pour afficher la taille du colis
  const renderPackageSize = (size: PackageSize) => {
    return t(`size${size.charAt(0) + size.slice(1).toLowerCase()}`);
  };

  // Fonction pour formater la date
  const formatDate = (date: Date) => {
    return formatDistance(new Date(date), new Date(), {
      addSuffix: true,
      locale: dateLocale,
    });
  };

  // Récupérer toutes les annonces de toutes les pages
  const announcements = data?.pages.flatMap((page) => page.announcements) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t("availableAnnouncements")}</h1>
        
        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              {t("filters")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("status")}</label>
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
                <label className="text-sm font-medium">{t("packageSize")}</label>
                <Select
                  value={packageSize}
                  onValueChange={(value) => setPackageSize(value as PackageSize | "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("allSizes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("allSizes")}</SelectItem>
                    <SelectItem value={PackageSize.SMALL}>{t("sizeSmall")}</SelectItem>
                    <SelectItem value={PackageSize.MEDIUM}>{t("sizeMedium")}</SelectItem>
                    <SelectItem value={PackageSize.LARGE}>{t("sizeLarge")}</SelectItem>
                    <SelectItem value={PackageSize.EXTRA_LARGE}>{t("sizeExtraLarge")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 col-span-1 md:col-span-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{t("priceRange")}</label>
                  <span className="text-sm text-gray-500">
                    {minPrice}€ - {maxPrice}€
                  </span>
                </div>
                <div className="pt-4">
                  <Slider
                    defaultValue={[minPrice, maxPrice]}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={(values) => {
                      setMinPrice(values[0]);
                      setMaxPrice(values[1]);
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="text-sm font-medium">{t("search")}</label>
              <div className="flex mt-1 gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t("searchPlaceholder")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button onClick={applyFilters}>
                  {t("applyFilters")}
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  {t("resetFilters")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Tri */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {announcements.length} {t("announcementsFound")}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">{t("sortByDate")}</SelectItem>
                <SelectItem value="price">{t("sortByPrice")}</SelectItem>
                <SelectItem value="deadline">{t("sortByDeadline")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Liste des annonces */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-32" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-medium">{t("noAnnouncementsFound")}</p>
            <p className="text-gray-500 mt-2">{t("tryDifferentFilters")}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => goToAnnouncementDetail(announcement.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{announcement.title}</CardTitle>
                      <CardDescription>
                        {t("postedBy")} {announcement.client.name} • {formatDate(announcement.createdAt)}
                      </CardDescription>
                    </div>
                    {renderStatusBadge(announcement.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t("route")}</p>
                        <p className="text-sm text-gray-500">
                          {announcement.pickupAddress} → {announcement.deliveryAddress}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t("package")}</p>
                        <p className="text-sm text-gray-500">
                          {renderPackageSize(announcement.packageSize)} • {announcement.packageWeight} kg
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t("deadline")}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(announcement.deadline)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">{t("price")}</p>
                        <p className="text-sm font-bold text-green-600">
                          {announcement.price.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-gray-50">
                  <Badge variant="outline">
                    {announcement.requiresInsurance ? t("insured") : t("notInsured")}
                  </Badge>
                  <Button variant="secondary">
                    {t("viewDetails")}
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
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
        )}
      </div>
    </div>
  );
}
