"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MapPin, Package, AlertCircle, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface DelivererAnnouncementsManagerProps {
  delivererId: string;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  type: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  pickupAddress: string;
  deliveryAddress: string;
  estimatedPrice: number;
  estimatedDuration: number;
  urgencyLevel: "low" | "medium" | "high";
  createdAt: string;
  scheduledDate?: string;
  clientName: string;
}

export default function DelivererAnnouncementsManager({
  delivererId,
}: DelivererAnnouncementsManagerProps) {
  const t = useTranslations("deliverer.announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<
    Announcement[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchAnnouncements();
  }, [delivererId]);

  useEffect(() => {
    filterAnnouncements();
  }, [announcements, searchTerm, statusFilter, typeFilter]);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(
        `/api/deliverer/announcements?delivererId=${delivererId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAnnouncements = () => {
    let filtered = announcements;

    if (searchTerm) {
      filtered = filtered.filter(
        (announcement) =>
          announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          announcement.description
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          announcement.pickupAddress
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          announcement.deliveryAddress
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (announcement) => announcement.status === statusFilter,
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (announcement) => announcement.type === typeFilter,
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const handleAcceptAnnouncement = async (announcementId: string) => {
    try {
      console.log("🚚 Acceptation d'annonce:", { announcementId, delivererId });

      const response = await fetch(
        `/api/deliverer/announcements/${announcementId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delivererId }),
        },
      );

      console.log("📡 Réponse API:", response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Acceptation réussie:", result);
        await fetchAnnouncements();
      } else {
        const errorText = await response.text();
        console.error("❌ Erreur API:", response.status, errorText);

        try {
          const errorJson = JSON.parse(errorText);
          console.error("❌ Détails erreur:", errorJson);
        } catch (e) {
          console.error("❌ Réponse non-JSON:", errorText);
        }
      }
    } catch (error) {
      console.error("❌ Error accepting announcement:", error);
    }
  };

  const handleDeclineAnnouncement = async (announcementId: string) => {
    try {
      const response = await fetch(
        `/api/deliverer/announcements/${announcementId}/decline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delivererId }),
        },
      );

      if (response.ok) {
        await fetchAnnouncements();
      }
    } catch (error) {
      console.error("Error declining announcement:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        label: t("status.pending"),
      },
      accepted: {
        color: "bg-blue-100 text-blue-800",
        label: t("status.accepted"),
      },
      in_progress: {
        color: "bg-orange-100 text-orange-800",
        label: t("status.in_progress"),
      },
      completed: {
        color: "bg-green-100 text-green-800",
        label: t("status.completed"),
      },
      cancelled: {
        color: "bg-red-100 text-red-800",
        label: t("status.cancelled"),
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "medium":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("description")}</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder={t("search.placeholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={t("filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="pending">{t("status.pending")}</SelectItem>
            <SelectItem value="accepted">{t("status.accepted")}</SelectItem>
            <SelectItem value="in_progress">
              {t("status.in_progress")}
            </SelectItem>
            <SelectItem value="completed">{t("status.completed")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={t("filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            <SelectItem value="package">{t("types.package")}</SelectItem>
            <SelectItem value="document">{t("types.document")}</SelectItem>
            <SelectItem value="food">{t("types.food")}</SelectItem>
            <SelectItem value="other">{t("types.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">{t("tabs.available")}</TabsTrigger>
          <TabsTrigger value="my_deliveries">
            {t("tabs.my_deliveries")}
          </TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {filteredAnnouncements
            .filter((a) => a.status === "pending")
            .map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {announcement.title}
                        {getUrgencyIcon(announcement.urgencyLevel)}
                      </CardTitle>
                      <CardDescription>
                        {announcement.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(announcement.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {t("pickup")}: {announcement.pickupAddress}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-600" />
                      <span className="text-sm">
                        {t("delivery")}: {announcement.deliveryAddress}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        {t("duration")}: {announcement.estimatedDuration} min
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {t("price")}: €{announcement.estimatedPrice}
                      </span>
                    </div>
                  </div>
                  {announcement.scheduledDate && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-600">
                        {t("scheduled_date")}:{" "}
                        {new Date(announcement.scheduledDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAcceptAnnouncement(announcement.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {t("actions.accept")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeclineAnnouncement(announcement.id)}
                    >
                      {t("actions.decline")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="my_deliveries" className="space-y-4">
          {filteredAnnouncements
            .filter((a) => ["accepted", "in_progress"].includes(a.status))
            .map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{announcement.title}</CardTitle>
                    {getStatusBadge(announcement.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        {announcement.pickupAddress}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-600" />
                      <span className="text-sm">
                        {announcement.deliveryAddress}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">
                      {t("client")}: {announcement.clientName}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {filteredAnnouncements
            .filter((a) => ["completed", "cancelled"].includes(a.status))
            .map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{announcement.title}</CardTitle>
                    {getStatusBadge(announcement.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {announcement.pickupAddress} →{" "}
                        {announcement.deliveryAddress}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        €{announcement.estimatedPrice}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
