"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Clock, 
  Euro, 
  User,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  Star,
  Package,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface OpportunityManagerProps {
  delivererId: string;
}

interface Opportunity {
  id: string;
  announcementId: string;
  title: string;
  description: string;
  type: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  clientName: string;
  clientPhone: string;
  clientRating: number;
  estimatedEarnings: number;
  distance: number;
  weight: number;
  volume?: number;
  requirements?: string[];
  urgency: string;
  compatibilityScore: number;
  createdAt: string;
}

export default function OpportunityManager({ delivererId }: OpportunityManagerProps) {
  const t = useTranslations("deliverer.opportunities");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: "",
    maxDistance: "",
    minEarnings: "",
    urgency: "",
    search: "",
  });

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.maxDistance) params.append("maxDistance", filters.maxDistance);
      if (filters.minEarnings) params.append("minEarnings", filters.minEarnings);
      if (filters.urgency) params.append("urgency", filters.urgency);

      const response = await fetch(`/api/deliverer/opportunities?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOpportunity = async (opportunityId: string) => {
    setAccepting(opportunityId);
    try {
      const response = await fetch(`/api/deliverer/opportunities/${opportunityId}/accept`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success(t("success.opportunity_accepted"));
        fetchOpportunities();
      } else {
        toast.error(t("error.accept_failed"));
      }
    } catch (error) {
      console.error("Error accepting opportunity:", error);
      toast.error(t("error.accept_failed"));
    } finally {
      setAccepting(null);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [delivererId, filters]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PACKAGE_DELIVERY": return "bg-blue-100 text-blue-800";
      case "PERSON_TRANSPORT": return "bg-green-100 text-green-800";
      case "AIRPORT_TRANSFER": return "bg-purple-100 text-purple-800";
      case "SHOPPING": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent": return "bg-red-100 text-red-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "flexible": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOpportunities = opportunities.filter(opportunity => {
    if (filters.search && !opportunity.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-semibold">
            {opportunities.length} {t("available_opportunities")}
          </span>
        </div>
        
        <Button onClick={fetchOpportunities} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("refresh")}
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            {t("filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder={t("search_placeholder")}
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({...filters, type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("filter_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("all_types")}</SelectItem>
                <SelectItem value="PACKAGE_DELIVERY">{t("package_delivery")}</SelectItem>
                <SelectItem value="PERSON_TRANSPORT">{t("person_transport")}</SelectItem>
                <SelectItem value="AIRPORT_TRANSFER">{t("airport_transfer")}</SelectItem>
                <SelectItem value="SHOPPING">{t("shopping")}</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder={t("max_distance")}
              value={filters.maxDistance}
              onChange={(e) => setFilters({...filters, maxDistance: e.target.value})}
            />

            <Input
              type="number"
              step="0.01"
              placeholder={t("min_earnings")}
              value={filters.minEarnings}
              onChange={(e) => setFilters({...filters, minEarnings: e.target.value})}
            />

            <Button 
              variant="outline" 
              onClick={() => setFilters({ type: "", maxDistance: "", minEarnings: "", urgency: "", search: "" })}
            >
              {t("clear_filters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des opportunités */}
      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("no_opportunities_title")}
              </h3>
              <p className="text-gray-600">{t("no_opportunities_description")}</p>
            </CardContent>
          </Card>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{opportunity.title}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(opportunity.type)}>
                          {t(opportunity.type.toLowerCase())}
                        </Badge>
                        <Badge className={getUrgencyColor(opportunity.urgency)}>
                          {t(opportunity.urgency)}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm">{opportunity.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t("pickup")}:</span>
                          <span>{opportunity.pickupAddress}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t("delivery")}:</span>
                          <span>{opportunity.deliveryAddress}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t("scheduled")}:</span>
                          <span>{new Date(opportunity.scheduledDate).toLocaleDateString()} {opportunity.scheduledTime}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{t("client")}:</span>
                          <span>{opportunity.clientName}</span>
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 mr-1" />
                            <span className="text-xs">{opportunity.clientRating}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6 pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {opportunity.estimatedEarnings.toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600">{opportunity.distance.toFixed(1)}km</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="text-purple-600">{opportunity.weight}kg</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                        <span className="text-orange-600">{opportunity.compatibilityScore}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptOpportunity(opportunity.id)}
                      disabled={accepting === opportunity.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {accepting === opportunity.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {t("accepting")}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t("accept")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 