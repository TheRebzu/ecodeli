"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPin, Plus, X, Route } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface RouteDeclarationManagerProps {
  delivererId: string;
}

interface RouteDeclaration {
  id: string;
  departureAddress: string;
  arrivalAddress: string;
  departureTime: string;
  arrivalTime: string;
  availableSpace: number;
  pricePerKm: number;
  description?: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  matchingAnnouncements?: number;
}

interface RouteForm {
  departureAddress: string;
  arrivalAddress: string;
  departureDate: Date | undefined;
  departureTime: string;
  arrivalTime: string;
  availableSpace: number;
  pricePerKm: number;
  description: string;
}

export default function RouteDeclarationManager({ delivererId }: RouteDeclarationManagerProps) {
  const t = useTranslations("deliverer.routes");
  const [routes, setRoutes] = useState<RouteDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RouteForm>({
    departureAddress: "",
    arrivalAddress: "",
    departureDate: undefined,
    departureTime: "",
    arrivalTime: "",
    availableSpace: 1,
    pricePerKm: 0.5,
    description: ""
  });

  useEffect(() => {
    fetchRoutes();
  }, [delivererId]);

  const fetchRoutes = async () => {
    try {
      const response = await fetch(`/api/deliverer/routes?delivererId=${delivererId}`);
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.routes || []);
      }
    } catch (error) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.departureDate) return;

    try {
      const routeData = {
        delivererId,
        departureAddress: formData.departureAddress,
        arrivalAddress: formData.arrivalAddress,
        departureTime: `${format(formData.departureDate, "yyyy-MM-dd")}T${formData.departureTime}:00`,
        arrivalTime: `${format(formData.departureDate, "yyyy-MM-dd")}T${formData.arrivalTime}:00`,
        availableSpace: formData.availableSpace,
        pricePerKm: formData.pricePerKm,
        description: formData.description
      };

      const response = await fetch("/api/deliverer/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routeData)
      });

      if (response.ok) {
        await fetchRoutes();
        setShowForm(false);
        setFormData({
          departureAddress: "",
          arrivalAddress: "",
          departureDate: undefined,
          departureTime: "",
          arrivalTime: "",
          availableSpace: 1,
          pricePerKm: 0.5,
          description: ""
        });
      }
    } catch (error) {
      console.error("Error creating route:", error);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      const response = await fetch(`/api/deliverer/routes/${routeId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        await fetchRoutes();
      }
    } catch (error) {
      console.error("Error deleting route:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-100 text-green-800", label: t("status.active") },
      completed: { color: "bg-blue-100 text-blue-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t("loading")}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("description")}</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("actions.declare_route")}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t("form.title")}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departureAddress">{t("form.departure_address")}</Label>
                  <Input
                    id="departureAddress"
                    value={formData.departureAddress}
                    onChange={(e) => setFormData({ ...formData, departureAddress: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalAddress">{t("form.arrival_address")}</Label>
                  <Input
                    id="arrivalAddress"
                    value={formData.arrivalAddress}
                    onChange={(e) => setFormData({ ...formData, arrivalAddress: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t("form.departure_date")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.departureDate ? format(formData.departureDate, "PPP") : t("form.select_date")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.departureDate}
                        onSelect={(date) => setFormData({ ...formData, departureDate: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="departureTime">{t("form.departure_time")}</Label>
                  <Input
                    id="departureTime"
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="arrivalTime">{t("form.arrival_time")}</Label>
                  <Input
                    id="arrivalTime"
                    type="time"
                    value={formData.arrivalTime}
                    onChange={(e) => setFormData({ ...formData, arrivalTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="availableSpace">{t("form.available_space")}</Label>
                  <Input
                    id="availableSpace"
                    type="number"
                    min="1"
                    value={formData.availableSpace}
                    onChange={(e) => setFormData({ ...formData, availableSpace: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pricePerKm">{t("form.price_per_km")}</Label>
                  <Input
                    id="pricePerKm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.pricePerKm}
                    onChange={(e) => setFormData({ ...formData, pricePerKm: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">{t("form.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("form.description_placeholder")}
                />
              </div>

              <Button type="submit" className="w-full">
                {t("form.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {routes.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    {t("route_from_to", { from: route.departureAddress, to: route.arrivalAddress })}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(route.status)}
                  {route.matchingAnnouncements && route.matchingAnnouncements > 0 && (
                    <Badge variant="outline">
                      {t("matching_announcements", { count: route.matchingAnnouncements })}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{t("departure")}: {new Date(route.departureTime).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span className="text-sm">{t("arrival")}: {new Date(route.arrivalTime).toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  {t("available_space")}: {route.availableSpace} | {t("price")}: €{route.pricePerKm}/km
                </div>
              </div>
              
              {route.description && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">{route.description}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {t("created_at")}: {new Date(route.createdAt).toLocaleDateString()}
                </span>
                {route.status === "active" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRoute(route.id)}
                  >
                    {t("actions.cancel")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {routes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Route className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
              <p className="text-gray-600 text-center mb-4">{t("empty.description")}</p>
              <Button onClick={() => setShowForm(true)}>
                {t("actions.declare_first_route")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}