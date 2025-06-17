"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Users,
  Euro,
  Star,
  MapPin,
  Calendar,
  Settings,
  Download,
  RefreshCw
} from "lucide-react";
import { api } from "@/trpc/react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ServiceManagement() {
  const t = useTranslations("admin.services.management");
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Récupération des données
  const { data: servicesData, isLoading, refetch } = api.admin.services.getAllServices.useQuery({
    search: searchTerm || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50
  });
  
  const { data: serviceStats } = api.admin.services.getServiceStats.useQuery();
  const { data: categories } = api.admin.services.getServiceCategories.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800";
      case "INACTIVE": return "bg-gray-100 text-gray-800";
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "SUSPENDED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE": return CheckCircle;
      case "INACTIVE": return XCircle;
      case "PENDING": return Clock;
      case "SUSPENDED": return AlertTriangle;
      default: return Clock;
    }
  };

  const handleViewService = (service: any) => {
    setSelectedService(service);
    setIsDetailsOpen(true);
  };

  // Mutations pour les actions de service
  const approveServiceMutation = api.admin.services.approveService.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const suspendServiceMutation = api.admin.services.suspendService.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  const handleApproveService = async (serviceId: string) => {
    try {
      await approveServiceMutation.mutateAsync({ serviceId });
    } catch (error) {
      console.error("Erreur lors de l'approbation du service:", error);
    }
  };

  const handleSuspendService = async (serviceId: string) => {
    try {
      await suspendServiceMutation.mutateAsync({ serviceId });
    } catch (error) {
      console.error("Erreur lors de la suspension du service:", error);
    }
  };

  const serviceOverviewCards = [
    {
      title: t("totalServices"),
      value: serviceStats?.totalServices || 0,
      icon: Wrench,
      description: t("allServices"),
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: t("activeServices"),
      value: serviceStats?.activeServices || 0,
      icon: CheckCircle,
      description: t("currentlyActive"),
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: t("pendingApproval"),
      value: serviceStats?.pendingServices || 0,
      icon: Clock,
      description: t("awaitingReview"),
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    },
    {
      title: t("totalProviders"),
      value: serviceStats?.totalProviders || 0,
      icon: Users,
      description: t("registeredProviders"),
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    }
  ];

  const StatusCard = ({ title, value, icon: Icon, description, color, bgColor }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("refresh")}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("addService")}
          </Button>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {serviceOverviewCards.map((card, index) => (
          <StatusCard key={index} {...card} />
        ))}
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("searchServices")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">{t("allCategories")}</option>
            {categories?.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">{t("allStatuses")}</option>
            <option value="ACTIVE">{t("active")}</option>
            <option value="INACTIVE">{t("inactive")}</option>
            <option value="PENDING">{t("pending")}</option>
            <option value="SUSPENDED">{t("suspended")}</option>
          </select>
        </div>
      </div>

      {/* Onglets */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
          <TabsTrigger value="pending">{t("tabs.pending")}</TabsTrigger>
          <TabsTrigger value="active">{t("tabs.active")}</TabsTrigger>
          <TabsTrigger value="suspended">{t("tabs.suspended")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("allServices")}</CardTitle>
              <CardDescription>{t("manageAllServices")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.service")}</TableHead>
                    <TableHead>{t("table.provider")}</TableHead>
                    <TableHead>{t("table.category")}</TableHead>
                    <TableHead>{t("table.price")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.rating")}</TableHead>
                    <TableHead>{t("table.created")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicesData && servicesData.length > 0 ? (
                    servicesData.map((service: any) => {
                      const StatusIcon = getStatusIcon(service.status);
                      return (
                        <TableRow key={service.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {service.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{service.provider?.user?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {service.provider?.serviceType}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{service.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{service.price?.toFixed(2)}€</p>
                              <p className="text-xs text-muted-foreground">
                                {service.duration}min
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(service.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {t(`status.${service.status.toLowerCase()}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="font-medium">
                                {service.rating?.toFixed(1) || "N/A"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({service.reviewCount || 0})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">
                                {format(new Date(service.createdAt), "dd MMM yyyy", { locale: fr })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(service.createdAt), "HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t("actions.title")}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleViewService(service)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("actions.view")}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t("actions.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {service.status === "PENDING" && (
                                  <DropdownMenuItem 
                                    className="text-green-600"
                                    onClick={() => handleApproveService(service.id)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    {t("actions.approve")}
                                  </DropdownMenuItem>
                                )}
                                {service.status === "ACTIVE" && (
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleSuspendService(service.id)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t("actions.suspend")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("actions.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Wrench className="h-8 w-8 text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">
                            {t("noServices")}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Autres onglets */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("pendingServices")}</CardTitle>
              <CardDescription>{t("servicesAwaitingApproval")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t("pendingServicesContent")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("activeServices")}</CardTitle>
              <CardDescription>{t("currentlyActiveServices")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t("activeServicesContent")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("suspendedServices")}</CardTitle>
              <CardDescription>{t("servicesSuspended")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t("suspendedServicesContent")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog des détails du service */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("serviceDetails")}</DialogTitle>
            <DialogDescription>
              {t("detailedInformation")} {selectedService?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedService && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{t("basicInfo")}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("name")}:</span>
                      <span className="font-medium">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("category")}:</span>
                      <Badge variant="outline">{selectedService.category}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("price")}:</span>
                      <span className="font-medium">{selectedService.price?.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("duration")}:</span>
                      <span>{selectedService.duration} minutes</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">{t("provider")}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("providerName")}:</span>
                      <span className="font-medium">{selectedService.provider?.user?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("email")}:</span>
                      <span>{selectedService.provider?.user?.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{t("performance")}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("rating")}:</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">
                          {selectedService.rating?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("reviews")}:</span>
                      <span>{selectedService.reviewCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("bookings")}:</span>
                      <span>{selectedService.bookingCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">{t("description")}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedService.description || t("noDescription")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              {t("close")}
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              {t("editService")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
