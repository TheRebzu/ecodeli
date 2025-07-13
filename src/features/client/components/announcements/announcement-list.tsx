"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import {
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  basePrice: number;
  finalPrice?: number;
  pickupDate?: string;
  deliveryDate?: string;
  isUrgent: boolean;
  createdAt: string;
  viewCount: number;
  matchCount: number;
}

interface AnnouncementListProps {
  clientId: string;
}

export default function AnnouncementList({ clientId }: AnnouncementListProps) {
  const t = useTranslations("client.announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<
    Announcement[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetchAnnouncements();
  }, [clientId]);

  useEffect(() => {
    filterAnnouncements();
  }, [announcements, searchTerm, statusFilter, typeFilter]);

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/client/announcements?clientId=${clientId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAnnouncements = () => {
    let filtered = announcements;

    if (searchTerm) {
      filtered = filtered.filter(
        (ann) =>
          ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ann.description.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter((ann) => ann.status === statusFilter);
    }

    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((ann) => ann.type === typeFilter);
    }

    setFilteredAnnouncements(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "PUBLISHED":
        return "bg-blue-100 text-blue-800";
      case "ASSIGNED":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "EXPIRED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PACKAGE":
        return t("types.package");
      case "PERSON":
        return t("types.person");
      case "SHOPPING":
        return t("types.shopping");
      case "PET":
        return t("types.pet");
      case "SERVICE":
        return t("types.service");
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm(t("actions.confirm_delete"))) return;

    try {
      const response = await fetch(`/api/client/announcements/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
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
      <Card>
        <CardHeader>
          <CardTitle>{t("filters.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("filters.search_placeholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("filters.status_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all_statuses")}</SelectItem>
                <SelectItem value="DRAFT">{t("statuses.draft")}</SelectItem>
                <SelectItem value="PUBLISHED">
                  {t("statuses.published")}
                </SelectItem>
                <SelectItem value="ASSIGNED">
                  {t("statuses.assigned")}
                </SelectItem>
                <SelectItem value="IN_PROGRESS">
                  {t("statuses.in_progress")}
                </SelectItem>
                <SelectItem value="COMPLETED">
                  {t("statuses.completed")}
                </SelectItem>
                <SelectItem value="CANCELLED">
                  {t("statuses.cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("filters.type_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all_types")}</SelectItem>
                <SelectItem value="PACKAGE">{t("types.package")}</SelectItem>
                <SelectItem value="PERSON">{t("types.person")}</SelectItem>
                <SelectItem value="SHOPPING">{t("types.shopping")}</SelectItem>
                <SelectItem value="PET">{t("types.pet")}</SelectItem>
                <SelectItem value="SERVICE">{t("types.service")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("empty.title")}
            </h3>
            <p className="text-gray-600 mb-4">{t("empty.description")}</p>
            <Link href="/client/announcements/create">
              <Button className="bg-blue-600 hover:bg-blue-700">
                {t("empty.create_first")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {announcement.title}
                    </CardTitle>
                    <Badge className={getStatusColor(announcement.status)}>
                      {t(`statuses.${announcement.status.toLowerCase()}`)}
                    </Badge>
                  </div>
                  {announcement.isUrgent && (
                    <Badge variant="destructive" className="text-xs">
                      {t("labels.urgent")}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <Badge variant="outline" className="mb-2">
                    {getTypeLabel(announcement.type)}
                  </Badge>
                  <p className="line-clamp-2">{announcement.description}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">
                      {announcement.pickupAddress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">
                      {announcement.deliveryAddress}
                    </span>
                  </div>
                  {announcement.pickupDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(announcement.pickupDate)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-semibold text-green-600">
                      {announcement.finalPrice || announcement.basePrice}€
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {announcement.viewCount} vues • {announcement.matchCount}{" "}
                    candidats
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/client/announcements/${announcement.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      {t("actions.view")}
                    </Button>
                  </Link>

                  {announcement.status === "DRAFT" && (
                    <Link
                      href={`/client/announcements/${announcement.id}/edit`}
                    >
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}

                  {["DRAFT", "PUBLISHED"].includes(announcement.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAnnouncement(announcement.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
