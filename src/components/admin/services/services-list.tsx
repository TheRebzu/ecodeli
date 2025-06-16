"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle} from "@/components/ui/alert-dialog";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Star,
  DollarSign,
  Package,
  ChevronLeft,
  ChevronRight} from "lucide-react";

type ServiceStatus = "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  status: ServiceStatus;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ServicesListProps {
  services: Service[];
  total: number;
  currentPage: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onEditService: (service: Service) => void;
  onDeleteService: (serviceId: string) => void;
  onUpdateStatus: (serviceId: string, status: ServiceStatus) => void;
  isDeleting?: boolean;
  isUpdatingStatus?: boolean;
}

const statusConfig = {
  ACTIVE: {
    label: "Actif",
    variant: "default" as const,
    color: "bg-green-100 text-green-800"},
  INACTIVE: {
    label: "Inactif",
    variant: "secondary" as const,
    color: "bg-gray-100 text-gray-800"},
  DRAFT: {
    label: "Brouillon",
    variant: "outline" as const,
    color: "bg-yellow-100 text-yellow-800"},
  SUSPENDED: {
    label: "Suspendu",
    variant: "destructive" as const,
    color: "bg-red-100 text-red-800"}};

export function ServicesList({
  services,
  total,
  currentPage,
  pageSize,
  isLoading,
  onPageChange,
  onEditService,
  onDeleteService,
  onUpdateStatus,
  isDeleting,
  isUpdatingStatus}: ServicesListProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    service: Service | null;
  }>({ isOpen: false, service: null  });

  const totalPages = Math.ceil(total / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"}).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"}).format(date);
  };

  const handleDeleteClick = (service: Service) => {
    setDeleteDialog({ isOpen: true, service  });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.service) {
      onDeleteService(deleteDialog.service.id);
      setDeleteDialog({ isOpen: false, service: null  });
    }
  };

  const handleStatusToggle = (service: Service) => {
    const newStatus = service.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    onUpdateStatus(service.id, newStatus);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5  }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <Package className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Aucun service trouvé</h3>
              <p className="text-muted-foreground">
                Aucun service ne correspond aux critères de recherche.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Services ({total} résultat{total > 1 ? "s" : ""})
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {startItem}-{endItem} sur {total}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {service.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{service.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {formatCurrency(service.price)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {service.rating.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusConfig[service.status].variant}
                      className={statusConfig[service.status].color}
                    >
                      {statusConfig[service.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(service.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => onEditService(service)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusToggle(service)}
                          disabled={isUpdatingStatus}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {service.status === "ACTIVE"
                            ? "Désactiver"
                            : "Activer"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(service)}
                          className="text-red-600"
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteDialog({ isOpen: open, service: null  })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le service "
              {deleteDialog.service?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
