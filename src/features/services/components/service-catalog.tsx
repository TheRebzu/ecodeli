"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Search, Filter, Star, Clock, MapPin, User } from "lucide-react";
// Define ServiceCategory locally to avoid Prisma client import on client side
type ServiceCategory = 'CLEANING' | 'GARDENING' | 'HANDYMAN' | 'TUTORING' | 'HEALTHCARE' | 'BEAUTY' | 'OTHER';

const ServiceCategoryValues: ServiceCategory[] = ['CLEANING', 'GARDENING', 'HANDYMAN', 'TUTORING', 'HEALTHCARE', 'BEAUTY', 'OTHER'];

interface Service {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  price: number;
  duration: number;
  provider: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      city: string;
    };
  };
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
}

interface ServiceCatalogProps {
  onServiceSelect?: (service: Service) => void;
}

export function ServiceCatalog({ onServiceSelect }: ServiceCatalogProps) {
  const t = useTranslations("client.services");
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchServices();
  }, [currentPage]);

  useEffect(() => {
    filterAndSortServices();
  }, [services, searchTerm, selectedCategory, sortBy]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/services?page=${currentPage}&limit=${itemsPerPage}`,
      );

      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortServices = () => {
    let filtered = [...services];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          `${service.provider.profile.firstName} ${service.provider.profile.lastName}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (service) => service.category === selectedCategory,
      );
    }

    // Sort services
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating":
          return b.averageRating - a.averageRating;
        case "duration":
          return a.duration - b.duration;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredServices(filtered);
  };

  const getCategoryLabel = (category: ServiceCategory) => {
    const categoryLabels: Record<ServiceCategory, string> = {
      CLEANING: t("categories.cleaning"),
      GARDENING: t("categories.gardening"),
      HANDYMAN: t("categories.handyman"),
      TUTORING: t("categories.tutoring"),
      HEALTHCARE: t("categories.healthcare"),
      BEAUTY: t("categories.beauty"),
      OTHER: t("categories.other"),
    };
    return categoryLabels[category] || category;
  };

  const getCategoryColor = (category: ServiceCategory) => {
    const colors: Record<ServiceCategory, string> = {
      CLEANING: "bg-blue-100 text-blue-800",
      GARDENING: "bg-green-100 text-green-800",
      HANDYMAN: "bg-orange-100 text-orange-800",
      TUTORING: "bg-purple-100 text-purple-800",
      HEALTHCARE: "bg-red-100 text-red-800",
      BEAUTY: "bg-pink-100 text-pink-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const handleServiceSelect = (service: Service) => {
    if (onServiceSelect) {
      onServiceSelect(service);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t("search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t("filters.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("filters.all_categories")}</SelectItem>
            {ServiceCategoryValues.map((category) => (
              <SelectItem key={category} value={category}>
                {getCategoryLabel(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder={t("filters.sort_by")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t("filters.sort.name")}</SelectItem>
            <SelectItem value="price">{t("filters.sort.price_low")}</SelectItem>
            <SelectItem value="price-desc">
              {t("filters.sort.price_high")}
            </SelectItem>
            <SelectItem value="rating">{t("filters.sort.rating")}</SelectItem>
            <SelectItem value="duration">
              {t("filters.sort.duration")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {t("no_results.title")}
              </h3>
              <p className="text-sm">{t("no_results.description")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <Badge className={getCategoryColor(service.category)}>
                    {getCategoryLabel(service.category)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm line-clamp-3">
                  {service.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {service.provider.profile.firstName}{" "}
                      {service.provider.profile.lastName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {service.provider.profile.city}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {service.duration} {t("duration.minutes")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">
                      {service.averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({service.totalReviews})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-2xl font-bold text-primary">
                    {service.price}€
                  </span>
                  <Button
                    onClick={() => handleServiceSelect(service)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {t("actions.book_now")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            {t("pagination.previous")}
          </Button>

          <span className="flex items-center px-4">
            {t("pagination.page")} {currentPage} {t("pagination.of")}{" "}
            {totalPages}
          </span>

          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
